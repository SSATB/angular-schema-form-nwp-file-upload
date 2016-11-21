'use strict';

angular
   .module('schemaForm')
   .config(['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
      function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
         var defaultPatternMsg  = 'Wrong file type. Allowed types are ',
             defaultMaxSizeMsg1 = 'This file is too large. Maximum size allowed is ',
             defaultMaxSizeMsg2 = 'Current file size:',
             defaultMinItemsMsg = 'You have to upload at least one file',
             defaultMaxItemsMsg = 'You can\'t upload more than one file.',
            defaultChunkedFileSize = 2000000; //2MB

            var nwpSinglefileUpload = function (name, schema, options) {
                if (schema.type === 'array' && schema.format === 'singlefile') {
                    if (schema.pattern && schema.pattern.mimeType && !schema.pattern.validationMessage) {
                        schema.pattern.validationMessage = defaultPatternMsg;
                    }
                    if (schema.maxSize && schema.maxSize.maximum && !schema.maxSize.validationMessage) {
                        schema.maxSize.validationMessage = defaultMaxSizeMsg1;
                        schema.maxSize.validationMessage2 = defaultMaxSizeMsg2;
                    }
                    if (schema.minItems && schema.minItems.minimum && !schema.minItems.validationMessage) {
                        schema.minItems.validationMessage = defaultMinItemsMsg;
                    }
                    if (schema.maxItems && schema.maxItems.maximum && !schema.maxItems.validationMessage) {
                        schema.maxItems.validationMessage = defaultMaxItemsMsg;
                    }
                    if (angular.isUndefined(schema.chunkedFileSize) || schema.chunkedFileSize == null) {
                        schema.chunkedFileSize = defaultChunkedFileSize;
                    }

                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'nwpFileUpload';
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

         schemaFormProvider.defaults.array.unshift(nwpSinglefileUpload);

         var nwpMultifileUpload = function (name, schema, options) {
             if (schema.type === 'array' && schema.format === 'multifile') {
                 if (schema.pattern && schema.pattern.mimeType && !schema.pattern.validationMessage) {
                     schema.pattern.validationMessage = defaultPatternMsg;
                 }
                 if (schema.maxSize && schema.maxSize.maximum && !schema.maxSize.validationMessage) {
                     schema.maxSize.validationMessage = defaultMaxSizeMsg1;
                     schema.maxSize.validationMessage2 = defaultMaxSizeMsg2;
                 }
                 if (schema.minItems && schema.minItems.minimum && !schema.minItems.validationMessage) {
                     schema.minItems.validationMessage = defaultMinItemsMsg;
                 }
                 if (schema.maxItems && schema.maxItems.maximum && !schema.maxItems.validationMessage) {
                     schema.maxItems.validationMessage = defaultMaxItemsMsg;
                 }
                 if (angular.isUndefined(schema.chunkedFileSize) || schema.chunkedFileSize == null) {
                     schema.chunkedFileSize = defaultChunkedFileSize;
                 }

                 var f = schemaFormProvider.stdFormObj(name, schema, options);
                 f.key = options.path;
                 f.type = 'nwpFileUpload';
                 options.lookup[sfPathProvider.stringify(options.path)] = f;
                 return f;
             }
         };

         schemaFormProvider.defaults.array.unshift(nwpMultifileUpload);

         schemaFormDecoratorsProvider.addMapping(
            'bootstrapDecorator',
            'nwpFileUpload',
            'directives/decorators/bootstrap/nwp-file/nwp-file.html'
         );
      }
   ]);

angular
   .module('ngSchemaFormFile', [
      'ngFileUpload',
      'ngMessages',
      'SSATB.LocalForage'
   ])
   .directive('ngSchemaFile', ['Upload', '$timeout', '$q', '$localForage','ssatbHttp', function (Upload, $timeout, $q, $localForage,ssatbHttp) {
      return {
         restrict: 'A',
         scope:    true,
         require:  'ngModel',
         link:     function (scope, element, attrs, ngModel) {
             scope.storageDomain = scope.form && scope.form.storageDomain;
             scope.metaData = scope.form && scope.form.metaData;
             scope.uploadedFiles = [];
             scope.apiInfo = getApiConfigFromApiInfo($localForage._localforage._config.apiInfo);
            scope.isSinglefileUpload = scope.form && scope.form.schema && scope.form.schema.format === 'singlefile';
            scope.uploadOnFileSelect = scope.form && scope.form.uploadOnFileSelect;
            scope.fileUploading = false;
            ngModel.$render = function () {
                if (ngModel.$modelValue != null) {
                    angular.forEach(ngModel.$modelValue, function (f, key) {
                        addFileToFileInfo(f)
                    });
                }
            }
            
            scope.selectFile  = function (file) {
               scope.picFile = file;
            };
            scope.selectFiles = function (files) {
               scope.picFiles = files;
            };

            scope.uploadFile = function (file) {
               file && doUpload(file);
            };

            scope.uploadFiles = function (files) {
               files.length && angular.forEach(files, function (file) {
                  doUpload(file);
               });
            };
            scope.deleteFile = function (file) {
                var apiInfo = scope.apiInfo;
                var url = apiInfo.Url + "/api/v1/storageDomains/" + scope.storageDomain + "/files/" + file.fileId;
                ssatbHttp.delete(url).then(function () {
                    var index = scope.uploadedFiles.indexOf(file);
                    scope.uploadedFiles.splice(index, 1);
                    var newValue = ngModel.$modelValue;
                    var mIndex = newValue.indexOf(file.fileId);
                    if (mIndex != -1) {
                        newValue.splice(mIndex, 1);
                        ngModel.$setViewValue(newValue);
                        ngModel.$commitViewValue();
                    }
                })
            }
            function getApiConfigFromApiInfo(apiInfoObject) {
                for (var apiInfo in apiInfoObject) {
                    var serviceName = apiInfoObject[apiInfo].ServiceName;
                    if (serviceName != null && serviceName.toLowerCase().trim() == "ssatb.fileservice")
                        return apiInfoObject[apiInfo];
                }
                return null;
            }
            function getFileInfo(fileId) {
                var apiInfo = scope.apiInfo;
                var url = apiInfo.Url + "/api/v1/storageDomains/" + scope.storageDomain + "/files/" + fileId;
                return ssatbHttp.get(url).then(function (response) { return response; });
            }
            function addFileToFileInfo(fileId)
            {
                return getFileInfo(fileId).then(function (f) {
                    f.name = f.properties.fileName;
                    scope.uploadedFiles.push(f);
                });
            }
            function doUpload(file) {
                scope.selectFile(file);
                var apiInfo = scope.apiInfo;
                if (file && !file.$error && apiInfo && scope.storageDomain) {
                    var url = apiInfo.Url + "/api/v1/storageDomains/" + scope.storageDomain + "/files";
                    var data = { file: file };
                    if (scope.metaData != null)
                        for (var key in scope.metaData)
                            data['x-file-metadata-' + key] = scope.metaData[key];
                    var uploadConfig =
                        {
                            url: url,
                            data: data,
                            headers: apiInfo.Headers
                        };
                    if (file.size > scope.form.schema.chunkedFileSize) {
                        //Initiate the file Upload
                        var chunkUrl = apiInfo.Url + "/api/v1/storageDomains/" + scope.storageDomain + "/chunked/files"
                        ssatbHttp.post(chunkUrl, {
                            "Content-Type": file.type,
                            "Content-Disposition": 'filename="' + file.name + '"'
                        }).then(function (response) {
                            var fileId = response.response;
                            uploadConfig.resumeSizeUrl = chunkUrl + "/" + fileId;
                            uploadConfig.url = chunkUrl + "/" + fileId;
                            uploadConfig.resumeChunkSize = scope.form.schema.chunkedFileSize,
                            uploadConfig.resumeSizeResponseReader = function (data) {
                                return data.properties.contentLength;
                            };
                            kickOffFileUpload(file, uploadConfig, fileId);
                            file.upload.progress(function (evt) {
                                file.progress = Math.min(100, parseInt(100.0 *
                                   evt.loaded / evt.total));
                            });
                        });
                    }
                    else {
                        kickOffFileUpload(file, uploadConfig);
                        file.upload.progress(function (evt) {
                            file.progress = Math.min(100, parseInt(100.0 *
                               evt.loaded / evt.total));
                        });
                    }
                }
            }
            function kickOffFileUpload(file, uploadConfig, fileId) {
                file.upload = Upload.upload(uploadConfig);
                scope.fileUploading = true;
                file.upload.then(function (response) {
                    $timeout(function () {
                        file.result = response.data;
                    });
                    if (angular.isUndefined(ngModel.$modelValue) || ngModel.$modelValue == null)
                        ngModel.$setViewValue([]);
                    var newValue = ngModel.$modelValue;
                    if (angular.isUndefined(fileId))
                        fileId = response.data;
                    newValue.push(fileId);
                    ngModel.$setViewValue(newValue);
                    ngModel.$commitViewValue();
                    addFileToFileInfo(fileId).then(function () {
                        scope.fileUploading = false;
                    })
                }, function (response) {
                    if (response.status > 0) {
                        scope.errorMsg = response.status + ': ' + response.data;
                    }
                });
            }

            scope.validateField = function () {
               if (scope.uploadForm.file && scope.uploadForm.file.$valid && scope.picFile && !scope.picFile.$error) {
                  console.log('singlefile-form is invalid');
               } else if (scope.uploadForm.files && scope.uploadForm.files.$valid && scope.picFiles && !scope.picFiles.$error) {
                  console.log('multifile-form is  invalid');
               } else {
                  console.log('single- and multifile-form are valid');
               }
            };
            scope.submit        = function () {
               if (scope.uploadForm.file && scope.uploadForm.file.$valid && scope.picFile && !scope.picFile.$error) {
                  scope.uploadFile(scope.picFile);
               } else if (scope.uploadForm.files && scope.uploadForm.files.$valid && scope.picFiles && !scope.picFiles.$error) {
                  scope.uploadFiles(scope.picFiles);
               }
            };
            scope.$on('schemaFormValidate', scope.validateField);
            scope.$on('schemaFormFileUploadSubmit', scope.submit);
         }
      };
   }]);

(function(module) {
try {
  module = angular.module('schemaForm');
} catch (e) {
  module = angular.module('schemaForm', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('directives/decorators/bootstrap/nwp-file/nwp-file.html',
    '<ng-form class="file-upload mb-lg" ng-schema-file="" ng-model="$$value$$" name="uploadForm"><label ng-show="form.title && form.notitle !== true" class="control-label" for="fileInputButton" ng-class="{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}">{{ form.title }}<i ng-show="form.required">&nbsp;*</i></label><div ng-hide="uploadOnFileSelect"><div ng-show="picFile"><div ng-include="\'uploadProcess.html\'" class="mb"></div></div><ul ng-show="picFiles && picFiles.length" class="list-group"><li class="list-group-item" ng-repeat="picFile in picFiles"><div ng-include="\'uploadProcess.html\'"></div></li></ul></div><div class="bg-white mb" ng-class="{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}"><small class="text-muted" ng-show="form.description" ng-bind-html="form.description"></small><div ng-if="isSinglefileUpload" ng-include="" src="form.templateUrlFileUpload ? form.templateUrlFileUpload : \'singleFileUpload.html\'"></div><div ng-if="!isSinglefileUpload" ng-include="form.templateUrlFileUpload ? form.templateUrlFileUpload : \'multiFileUpload.html\'"></div><div class="help-block mb0" ng-show="uploadForm.$error.required && !uploadForm.$pristine">{{ \'modules.attribute.fields.required.caption\' | translate }}</div><div class="help-block mb0" ng-show="(hasError() && errorMessage(schemaError()))" ng-bind-html="(hasError() && errorMessage(schemaError()))"></div></div></ng-form><script type="text/ng-template" id="uploadProcess.html"><div class="row mb"> <div class="col-sm-4 mb-sm"> <label title="{{ \'modules.upload.field.preview\' | translate }}" class="text-info"> {{ \'modules.upload.field.preview\' | translate }} </label> <img ngf-src="picFile" class="img-thumbnail img-responsive"> <div class="img-placeholder" ng-class="{\'show\': picFile.$invalid && !picFile.blobUrl, \'hide\': !picFile || picFile.blobUrl}"> No preview available </div> </div> <div class="col-sm-4 mb-sm"> <label title="{{ \'modules.upload.field.filename\' | translate }}" class="text-info"> {{ \'modules.upload.field.filename\' | translate }} </label> <div class="filename" title="{{ picFile.name }}">{{ picFile.name }}</div> </div> <div class="col-sm-4 mb-sm"> <label title="{{ \'modules.upload.field.progress\' | translate }}" class="text-info"> {{ \'modules.upload.field.progress\' | translate }} </label> <div class="progress"> <div class="progress-bar progress-bar-striped" role="progressbar" ng-class="{\'progress-bar-success\': picFile.progress == 100}" ng-style="{width: picFile.progress + \'%\'}"> {{ picFile.progress }} % </div> </div> <button class="btn btn-primary btn-sm" type="button" ng-click="uploadFile(picFile)" ng-disabled="!picFile || picFile.$error"> {{ "buttons.upload" | translate }} </button> </div> </div> <div ng-messages="uploadForm.$error" ng-messages-multiple=""> <div class="text-danger errorMsg" ng-message="maxSize">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong>. ({{ form.schema[picFile.$error].validationMessage2 | translate }} <strong>{{picFile.size / 1000000|number:1}}MB</strong>)</div> <div class="text-danger errorMsg" ng-message="pattern">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-message="maxItems">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-message="minItems">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-show="errorMsg">{{errorMsg}}</div> </div></script><script type="text/ng-template" id="singleFileUpload.html"><div ngf-drop="selectFile(picFile)" ngf-select="selectFile(picFile)" type="file" ngf-multiple="false" ng-model="picFile" name="file" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" ngf-drag-over-class="dragover" class="drop-box dragAndDropDescription"> <p class="text-center">{{ \'modules.upload.descriptionSinglefile\' | translate }}</p> </div> <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div> <button ngf-select="selectFile(picFile)" type="file" ngf-multiple="false" ng-model="picFile" name="file" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" id="fileInputButton" class="btn btn-primary btn-block {{form.htmlClass}} mt-lg mb"> <fa fw="fw" name="upload" class="mr-sm"></fa> {{ "buttons.add" | translate }} </button></script><script type="text/ng-template" id="multiFileUpload.html"><div ngf-drop="selectFiles(picFiles)" ngf-select="selectFiles(picFiles)" type="file" ngf-multiple="true" ng-model="picFiles" name="files" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" ngf-drag-over-class="dragover" class="drop-box dragAndDropDescription"> <p class="text-center">{{ \'modules.upload.descriptionMultifile\' | translate }}</p> </div> <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div> <button ngf-select="selectFiles(picFiles)" type="file" ngf-multiple="true" multiple ng-model="picFiles" name="files" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" ng-model-options="form.ngModelOptions" id="fileInputButton" class="btn btn-primary btn-block {{form.htmlClass}} mt-lg mb"> <fa fw="fw" name="upload" class="mr-sm"></fa> {{ "buttons.add" | translate }} </button></script>');
}]);
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjaGVtYS1mb3JtLWZpbGUuanMiLCJud3AtZmlsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjaGVtYS1mb3JtLWZpbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG5hbmd1bGFyXHJcbiAgIC5tb2R1bGUoJ3NjaGVtYUZvcm0nKVxyXG4gICAuY29uZmlnKFsnc2NoZW1hRm9ybVByb3ZpZGVyJywgJ3NjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXInLCAnc2ZQYXRoUHJvdmlkZXInLFxyXG4gICAgICBmdW5jdGlvbiAoc2NoZW1hRm9ybVByb3ZpZGVyLCBzY2hlbWFGb3JtRGVjb3JhdG9yc1Byb3ZpZGVyLCBzZlBhdGhQcm92aWRlcikge1xyXG4gICAgICAgICB2YXIgZGVmYXVsdFBhdHRlcm5Nc2cgID0gJ1dyb25nIGZpbGUgdHlwZS4gQWxsb3dlZCB0eXBlcyBhcmUgJyxcclxuICAgICAgICAgICAgIGRlZmF1bHRNYXhTaXplTXNnMSA9ICdUaGlzIGZpbGUgaXMgdG9vIGxhcmdlLiBNYXhpbXVtIHNpemUgYWxsb3dlZCBpcyAnLFxyXG4gICAgICAgICAgICAgZGVmYXVsdE1heFNpemVNc2cyID0gJ0N1cnJlbnQgZmlsZSBzaXplOicsXHJcbiAgICAgICAgICAgICBkZWZhdWx0TWluSXRlbXNNc2cgPSAnWW91IGhhdmUgdG8gdXBsb2FkIGF0IGxlYXN0IG9uZSBmaWxlJyxcclxuICAgICAgICAgICAgIGRlZmF1bHRNYXhJdGVtc01zZyA9ICdZb3UgY2FuXFwndCB1cGxvYWQgbW9yZSB0aGFuIG9uZSBmaWxlLicsXHJcbiAgICAgICAgICAgIGRlZmF1bHRDaHVua2VkRmlsZVNpemUgPSAyMDAwMDAwOyAvLzJNQlxyXG5cclxuICAgICAgICAgICAgdmFyIG53cFNpbmdsZWZpbGVVcGxvYWQgPSBmdW5jdGlvbiAobmFtZSwgc2NoZW1hLCBvcHRpb25zKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLnR5cGUgPT09ICdhcnJheScgJiYgc2NoZW1hLmZvcm1hdCA9PT0gJ3NpbmdsZWZpbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5wYXR0ZXJuICYmIHNjaGVtYS5wYXR0ZXJuLm1pbWVUeXBlICYmICFzY2hlbWEucGF0dGVybi52YWxpZGF0aW9uTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEucGF0dGVybi52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRQYXR0ZXJuTXNnO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLm1heFNpemUgJiYgc2NoZW1hLm1heFNpemUubWF4aW11bSAmJiAhc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0TWF4U2l6ZU1zZzE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlMiA9IGRlZmF1bHRNYXhTaXplTXNnMjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5taW5JdGVtcyAmJiBzY2hlbWEubWluSXRlbXMubWluaW11bSAmJiAhc2NoZW1hLm1pbkl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5taW5JdGVtcy52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRNaW5JdGVtc01zZztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5tYXhJdGVtcyAmJiBzY2hlbWEubWF4SXRlbXMubWF4aW11bSAmJiAhc2NoZW1hLm1heEl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhJdGVtcy52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRNYXhJdGVtc01zZztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQoc2NoZW1hLmNodW5rZWRGaWxlU2l6ZSkgfHwgc2NoZW1hLmNodW5rZWRGaWxlU2l6ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5jaHVua2VkRmlsZVNpemUgPSBkZWZhdWx0Q2h1bmtlZEZpbGVTaXplO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGYua2V5ID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgIGYudHlwZSA9ICdud3BGaWxlVXBsb2FkJztcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgc2NoZW1hRm9ybVByb3ZpZGVyLmRlZmF1bHRzLmFycmF5LnVuc2hpZnQobndwU2luZ2xlZmlsZVVwbG9hZCk7XHJcblxyXG4gICAgICAgICB2YXIgbndwTXVsdGlmaWxlVXBsb2FkID0gZnVuY3Rpb24gKG5hbWUsIHNjaGVtYSwgb3B0aW9ucykge1xyXG4gICAgICAgICAgICAgaWYgKHNjaGVtYS50eXBlID09PSAnYXJyYXknICYmIHNjaGVtYS5mb3JtYXQgPT09ICdtdWx0aWZpbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5wYXR0ZXJuICYmIHNjaGVtYS5wYXR0ZXJuLm1pbWVUeXBlICYmICFzY2hlbWEucGF0dGVybi52YWxpZGF0aW9uTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICBzY2hlbWEucGF0dGVybi52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRQYXR0ZXJuTXNnO1xyXG4gICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLm1heFNpemUgJiYgc2NoZW1hLm1heFNpemUubWF4aW11bSAmJiAhc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0TWF4U2l6ZU1zZzE7XHJcbiAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlMiA9IGRlZmF1bHRNYXhTaXplTXNnMjtcclxuICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5taW5JdGVtcyAmJiBzY2hlbWEubWluSXRlbXMubWluaW11bSAmJiAhc2NoZW1hLm1pbkl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5taW5JdGVtcy52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRNaW5JdGVtc01zZztcclxuICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5tYXhJdGVtcyAmJiBzY2hlbWEubWF4SXRlbXMubWF4aW11bSAmJiAhc2NoZW1hLm1heEl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhJdGVtcy52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRNYXhJdGVtc01zZztcclxuICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQoc2NoZW1hLmNodW5rZWRGaWxlU2l6ZSkgfHwgc2NoZW1hLmNodW5rZWRGaWxlU2l6ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5jaHVua2VkRmlsZVNpemUgPSBkZWZhdWx0Q2h1bmtlZEZpbGVTaXplO1xyXG4gICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgIGYua2V5ID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgICAgICAgICAgICAgIGYudHlwZSA9ICdud3BGaWxlVXBsb2FkJztcclxuICAgICAgICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBmO1xyXG4gICAgICAgICAgICAgfVxyXG4gICAgICAgICB9O1xyXG5cclxuICAgICAgICAgc2NoZW1hRm9ybVByb3ZpZGVyLmRlZmF1bHRzLmFycmF5LnVuc2hpZnQobndwTXVsdGlmaWxlVXBsb2FkKTtcclxuXHJcbiAgICAgICAgIHNjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXIuYWRkTWFwcGluZyhcclxuICAgICAgICAgICAgJ2Jvb3RzdHJhcERlY29yYXRvcicsXHJcbiAgICAgICAgICAgICdud3BGaWxlVXBsb2FkJyxcclxuICAgICAgICAgICAgJ2RpcmVjdGl2ZXMvZGVjb3JhdG9ycy9ib290c3RyYXAvbndwLWZpbGUvbndwLWZpbGUuaHRtbCdcclxuICAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICBdKTtcclxuXHJcbmFuZ3VsYXJcclxuICAgLm1vZHVsZSgnbmdTY2hlbWFGb3JtRmlsZScsIFtcclxuICAgICAgJ25nRmlsZVVwbG9hZCcsXHJcbiAgICAgICduZ01lc3NhZ2VzJyxcclxuICAgICAgJ1NTQVRCLkxvY2FsRm9yYWdlJ1xyXG4gICBdKVxyXG4gICAuZGlyZWN0aXZlKCduZ1NjaGVtYUZpbGUnLCBbJ1VwbG9hZCcsICckdGltZW91dCcsICckcScsICckbG9jYWxGb3JhZ2UnLCdzc2F0Ykh0dHAnLCBmdW5jdGlvbiAoVXBsb2FkLCAkdGltZW91dCwgJHEsICRsb2NhbEZvcmFnZSxzc2F0Ykh0dHApIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgc2NvcGU6ICAgIHRydWUsXHJcbiAgICAgICAgIHJlcXVpcmU6ICAnbmdNb2RlbCcsXHJcbiAgICAgICAgIGxpbms6ICAgICBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBuZ01vZGVsKSB7XHJcbiAgICAgICAgICAgICBzY29wZS5zdG9yYWdlRG9tYWluID0gc2NvcGUuZm9ybSAmJiBzY29wZS5mb3JtLnN0b3JhZ2VEb21haW47XHJcbiAgICAgICAgICAgICBzY29wZS5tZXRhRGF0YSA9IHNjb3BlLmZvcm0gJiYgc2NvcGUuZm9ybS5tZXRhRGF0YTtcclxuICAgICAgICAgICAgIHNjb3BlLnVwbG9hZGVkRmlsZXMgPSBbXTtcclxuICAgICAgICAgICAgIHNjb3BlLmFwaUluZm8gPSBnZXRBcGlDb25maWdGcm9tQXBpSW5mbygkbG9jYWxGb3JhZ2UuX2xvY2FsZm9yYWdlLl9jb25maWcuYXBpSW5mbyk7XHJcbiAgICAgICAgICAgIHNjb3BlLmlzU2luZ2xlZmlsZVVwbG9hZCA9IHNjb3BlLmZvcm0gJiYgc2NvcGUuZm9ybS5zY2hlbWEgJiYgc2NvcGUuZm9ybS5zY2hlbWEuZm9ybWF0ID09PSAnc2luZ2xlZmlsZSc7XHJcbiAgICAgICAgICAgIHNjb3BlLnVwbG9hZE9uRmlsZVNlbGVjdCA9IHNjb3BlLmZvcm0gJiYgc2NvcGUuZm9ybS51cGxvYWRPbkZpbGVTZWxlY3Q7XHJcbiAgICAgICAgICAgIHNjb3BlLmZpbGVVcGxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgbmdNb2RlbC4kcmVuZGVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5nTW9kZWwuJG1vZGVsVmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChuZ01vZGVsLiRtb2RlbFZhbHVlLCBmdW5jdGlvbiAoZiwga2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEZpbGVUb0ZpbGVJbmZvKGYpXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHNjb3BlLnNlbGVjdEZpbGUgID0gZnVuY3Rpb24gKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgc2NvcGUucGljRmlsZSA9IGZpbGU7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHNjb3BlLnNlbGVjdEZpbGVzID0gZnVuY3Rpb24gKGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgIHNjb3BlLnBpY0ZpbGVzID0gZmlsZXM7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlID0gZnVuY3Rpb24gKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgZmlsZSAmJiBkb1VwbG9hZChmaWxlKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzID0gZnVuY3Rpb24gKGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgIGZpbGVzLmxlbmd0aCAmJiBhbmd1bGFyLmZvckVhY2goZmlsZXMsIGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgIGRvVXBsb2FkKGZpbGUpO1xyXG4gICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgc2NvcGUuZGVsZXRlRmlsZSA9IGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXBpSW5mbyA9IHNjb3BlLmFwaUluZm87XHJcbiAgICAgICAgICAgICAgICB2YXIgdXJsID0gYXBpSW5mby5VcmwgKyBcIi9hcGkvdjEvc3RvcmFnZURvbWFpbnMvXCIgKyBzY29wZS5zdG9yYWdlRG9tYWluICsgXCIvZmlsZXMvXCIgKyBmaWxlLmZpbGVJZDtcclxuICAgICAgICAgICAgICAgIHNzYXRiSHR0cC5kZWxldGUodXJsKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBzY29wZS51cGxvYWRlZEZpbGVzLmluZGV4T2YoZmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkZWRGaWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdWYWx1ZSA9IG5nTW9kZWwuJG1vZGVsVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1JbmRleCA9IG5ld1ZhbHVlLmluZGV4T2YoZmlsZS5maWxlSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtSW5kZXggIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUuc3BsaWNlKG1JbmRleCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShuZXdWYWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZnVuY3Rpb24gZ2V0QXBpQ29uZmlnRnJvbUFwaUluZm8oYXBpSW5mb09iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXBpSW5mbyBpbiBhcGlJbmZvT2JqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlcnZpY2VOYW1lID0gYXBpSW5mb09iamVjdFthcGlJbmZvXS5TZXJ2aWNlTmFtZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VydmljZU5hbWUgIT0gbnVsbCAmJiBzZXJ2aWNlTmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKSA9PSBcInNzYXRiLmZpbGVzZXJ2aWNlXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcGlJbmZvT2JqZWN0W2FwaUluZm9dO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZnVuY3Rpb24gZ2V0RmlsZUluZm8oZmlsZUlkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXBpSW5mbyA9IHNjb3BlLmFwaUluZm87XHJcbiAgICAgICAgICAgICAgICB2YXIgdXJsID0gYXBpSW5mby5VcmwgKyBcIi9hcGkvdjEvc3RvcmFnZURvbWFpbnMvXCIgKyBzY29wZS5zdG9yYWdlRG9tYWluICsgXCIvZmlsZXMvXCIgKyBmaWxlSWQ7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3NhdGJIdHRwLmdldCh1cmwpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7IHJldHVybiByZXNwb25zZTsgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZnVuY3Rpb24gYWRkRmlsZVRvRmlsZUluZm8oZmlsZUlkKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0RmlsZUluZm8oZmlsZUlkKS50aGVuKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZi5uYW1lID0gZi5wcm9wZXJ0aWVzLmZpbGVOYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZGVkRmlsZXMucHVzaChmKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGRvVXBsb2FkKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdEZpbGUoZmlsZSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXBpSW5mbyA9IHNjb3BlLmFwaUluZm87XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSAmJiAhZmlsZS4kZXJyb3IgJiYgYXBpSW5mbyAmJiBzY29wZS5zdG9yYWdlRG9tYWluKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVybCA9IGFwaUluZm8uVXJsICsgXCIvYXBpL3YxL3N0b3JhZ2VEb21haW5zL1wiICsgc2NvcGUuc3RvcmFnZURvbWFpbiArIFwiL2ZpbGVzXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSB7IGZpbGU6IGZpbGUgfTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUubWV0YURhdGEgIT0gbnVsbClcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNjb3BlLm1ldGFEYXRhKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVsneC1maWxlLW1ldGFkYXRhLScgKyBrZXldID0gc2NvcGUubWV0YURhdGFba2V5XTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdXBsb2FkQ29uZmlnID1cclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBkYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogYXBpSW5mby5IZWFkZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGUuc2l6ZSA+IHNjb3BlLmZvcm0uc2NoZW1hLmNodW5rZWRGaWxlU2l6ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0luaXRpYXRlIHRoZSBmaWxlIFVwbG9hZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2h1bmtVcmwgPSBhcGlJbmZvLlVybCArIFwiL2FwaS92MS9zdG9yYWdlRG9tYWlucy9cIiArIHNjb3BlLnN0b3JhZ2VEb21haW4gKyBcIi9jaHVua2VkL2ZpbGVzXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3NhdGJIdHRwLnBvc3QoY2h1bmtVcmwsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IGZpbGUudHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29udGVudC1EaXNwb3NpdGlvblwiOiAnZmlsZW5hbWU9XCInICsgZmlsZS5uYW1lICsgJ1wiJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGVJZCA9IHJlc3BvbnNlLnJlc3BvbnNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ29uZmlnLnJlc3VtZVNpemVVcmwgPSBjaHVua1VybCArIFwiL1wiICsgZmlsZUlkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ29uZmlnLnVybCA9IGNodW5rVXJsICsgXCIvXCIgKyBmaWxlSWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRDb25maWcucmVzdW1lQ2h1bmtTaXplID0gc2NvcGUuZm9ybS5zY2hlbWEuY2h1bmtlZEZpbGVTaXplLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ29uZmlnLnJlc3VtZVNpemVSZXNwb25zZVJlYWRlciA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEucHJvcGVydGllcy5jb250ZW50TGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpY2tPZmZGaWxlVXBsb2FkKGZpbGUsIHVwbG9hZENvbmZpZywgZmlsZUlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUudXBsb2FkLnByb2dyZXNzKGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnByb2dyZXNzID0gTWF0aC5taW4oMTAwLCBwYXJzZUludCgxMDAuMCAqXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAga2lja09mZkZpbGVVcGxvYWQoZmlsZSwgdXBsb2FkQ29uZmlnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS51cGxvYWQucHJvZ3Jlc3MoZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IE1hdGgubWluKDEwMCwgcGFyc2VJbnQoMTAwLjAgKlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZnVuY3Rpb24ga2lja09mZkZpbGVVcGxvYWQoZmlsZSwgdXBsb2FkQ29uZmlnLCBmaWxlSWQpIHtcclxuICAgICAgICAgICAgICAgIGZpbGUudXBsb2FkID0gVXBsb2FkLnVwbG9hZCh1cGxvYWRDb25maWcpO1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuZmlsZVVwbG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBmaWxlLnVwbG9hZC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5yZXN1bHQgPSByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKG5nTW9kZWwuJG1vZGVsVmFsdWUpIHx8IG5nTW9kZWwuJG1vZGVsVmFsdWUgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKFtdKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3VmFsdWUgPSBuZ01vZGVsLiRtb2RlbFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKGZpbGVJZCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVJZCA9IHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUucHVzaChmaWxlSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShuZXdWYWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmdNb2RlbC4kY29tbWl0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYWRkRmlsZVRvRmlsZUluZm8oZmlsZUlkKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsZVVwbG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5lcnJvck1zZyA9IHJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzY29wZS52YWxpZGF0ZUZpZWxkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZS4kdmFsaWQgJiYgc2NvcGUucGljRmlsZSAmJiAhc2NvcGUucGljRmlsZS4kZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZWZpbGUtZm9ybSBpcyBpbnZhbGlkJyk7XHJcbiAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlcyAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGVzLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlcyAmJiAhc2NvcGUucGljRmlsZXMuJGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtdWx0aWZpbGUtZm9ybSBpcyAgaW52YWxpZCcpO1xyXG4gICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlLSBhbmQgbXVsdGlmaWxlLWZvcm0gYXJlIHZhbGlkJyk7XHJcbiAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgc2NvcGUuc3VibWl0ICAgICAgICA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZSAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGUuJHZhbGlkICYmIHNjb3BlLnBpY0ZpbGUgJiYgIXNjb3BlLnBpY0ZpbGUuJGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGUoc2NvcGUucGljRmlsZSk7XHJcbiAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlcyAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGVzLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlcyAmJiAhc2NvcGUucGljRmlsZXMuJGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzKHNjb3BlLnBpY0ZpbGVzKTtcclxuICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBzY29wZS4kb24oJ3NjaGVtYUZvcm1WYWxpZGF0ZScsIHNjb3BlLnZhbGlkYXRlRmllbGQpO1xyXG4gICAgICAgICAgICBzY29wZS4kb24oJ3NjaGVtYUZvcm1GaWxlVXBsb2FkU3VibWl0Jywgc2NvcGUuc3VibWl0KTtcclxuICAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICB9XSk7XHJcbiIsbnVsbF19
