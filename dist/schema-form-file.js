'use strict';

angular
   .module('schemaForm')
   .config(['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider', 'sfBuilderProvider',
      function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider, sfBuilderProvider) {
          var defaultPatternMsg = 'Wrong file type. Allowed types are ',
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
             'decorators/bootstrap/nwp-file/nwp-file.html'
          );
          var sfField = sfBuilderProvider.builders.sfField;
          var ngModel = sfBuilderProvider.builders.ngModel;
          var ngModelOptions = sfBuilderProvider.builders.ngModelOptions;
          var defaults = [sfField, ngModel];
          schemaFormDecoratorsProvider.defineAddOn('bootstrapDecorator', 'nwpFileUpload', 'decorators/bootstrap/nwp-file/nwp-file.html', defaults);

      }
   ]);

angular
   .module('ngSchemaFormFile', [
      'ngFileUpload',
      'ngMessages',
      'SSATB.LocalForage'
   ])
   .directive('ngSchemaFile', ['Upload', '$timeout', '$q', '$localForage', 'ssatbHttp', function (Upload, $timeout, $q, $localForage, ssatbHttp) {
       return {
           restrict: 'A',
           scope: true,
           require: 'ngModel',
           link: function (scope, element, attrs, ngModel) {
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

               scope.selectFile = function (file) {
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
               function addFileToFileInfo(fileId) {
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
                           var metData = {
                               "Content-Type": file.type,
                               "Content-Disposition": 'filename="' + file.name + '"'
                           };
                           if (scope.metaData != null)
                               for (var key in scope.metaData)
                                   metData[key] = scope.metaData[key];

                           ssatbHttp.post(chunkUrl, metData).then(function (response) {
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
               scope.submit = function () {
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
    '<ng-form class="file-upload mb-lg" ng-schema-file="" ng-model="$$value$$" sf-field-model="" sf-changed="form" name="uploadForm_{{form.key.slice(-1)[0]}}"><label ng-show="form.title && form.notitle !== true" class="control-label" for="fileInputButton" ng-class="{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}">{{ form.title }}<i ng-show="form.required">&nbsp;*</i></label><div ng-hide="uploadOnFileSelect"><div ng-show="picFile"><div ng-include="\'uploadProcess.html\'" class="mb"></div></div><ul ng-show="picFiles && picFiles.length" class="list-group"><li class="list-group-item" ng-repeat="picFile in picFiles"><div ng-include="\'uploadProcess.html\'"></div></li></ul></div><div class="bg-white mb" ng-class="{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}"><small class="text-muted" ng-show="form.description" ng-bind-html="form.description"></small><div ng-if="isSinglefileUpload" ng-include="" src="form.templateUrlFileUpload ? form.templateUrlFileUpload : \'singleFileUpload.html\'"></div><div ng-if="!isSinglefileUpload" ng-include="form.templateUrlFileUpload ? form.templateUrlFileUpload : \'multiFileUpload.html\'"></div><div class="help-block mb0" ng-show="uploadForm.$error.required && !uploadForm.$pristine">{{ \'modules.attribute.fields.required.caption\' | translate }}</div><div class="help-block mb0" ng-show="(hasError() && errorMessage(schemaError()))" ng-bind-html="(hasError() && errorMessage(schemaError()))"></div></div></ng-form><script type="text/ng-template" id="partials/simpleFileUpload.html"><div class="row"> <div class="col-sm-2 {{ uploadedFiles.length >= form.schema.maxItems.maximum ? \'attachment-button-disabled\' : \'attachment-button\' }}" title="{{ uploadedFiles.length >= form.schema.maxItems.maximum && form.schema.maxItems.warningMessage ? form.schema.maxItems.warningMessage : \'\' }}"> <a href ngf-select="uploadFile(picFile)" type="file" ngf-multiple="false" ng-model="picFile" name="file" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" id="fileInputlink" class="ui icon"> <span style="padding-top:0px; margin-top:0px;" class="ion-paperclip"></span> </a> </div> <div class="col-sm-4 uploaded-files"> <div class="{{form.htmlClassUploadedFiles}}" ng-repeat="uploadedFile in uploadedFiles"> <a href="{{ uploadedFile.downloadUrl }}" download>{{ uploadedFile.name }}</a> <a href> <span ng-click="deleteFile(uploadedFile)" class="glyphicon glyphicon-remove"></span> </a> </div> </div> <div ng-show="fileUploading" class="col-sm-4 mb-sm"> <div class="filename" title="{{ picFile.name }}">{{ picFile.name }}</div> </div> <div ng-show="fileUploading" class="col-sm-4 mb-sm"> <div class="progress"> <div class="progress-bar progress-bar-striped" role="progressbar" ng-class="{\'progress-bar-success\': picFile.progress == 100}" ng-style="{width: picFile.progress + \'%\'}"> {{ picFile.progress }} % </div> </div> </div> <div ng-messages="uploadForm.$error" ng-messages-multiple=""> <div class="text-danger errorMsg" ng-message="maxSize">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong>. ({{ form.schema[picFile.$error].validationMessage2 | translate }} <strong>{{picFile.size / 1000000|number:1}}MB</strong>)</div> <div class="text-danger errorMsg" ng-message="pattern">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-message="maxItems">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-message="minItems">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-show="errorMsg">{{errorMsg}}</div> </div> </div></script><script type="text/ng-template" id="uploadProcess.html"><div class="row mb"> <div class="col-sm-4 mb-sm"> <label title="{{ \'modules.upload.field.preview\' | translate }}" class="text-info"> {{ \'modules.upload.field.preview\' | translate }} </label> <img ngf-src="picFile" class="img-thumbnail img-responsive"> <div class="img-placeholder" ng-class="{\'show\': picFile.$invalid && !picFile.blobUrl, \'hide\': !picFile || picFile.blobUrl}"> No preview available </div> </div> <div class="col-sm-4 mb-sm"> <label title="{{ \'modules.upload.field.filename\' | translate }}" class="text-info"> {{ \'modules.upload.field.filename\' | translate }} </label> <div class="filename" title="{{ picFile.name }}">{{ picFile.name }}</div> </div> <div class="col-sm-4 mb-sm"> <label title="{{ \'modules.upload.field.progress\' | translate }}" class="text-info"> {{ \'modules.upload.field.progress\' | translate }} </label> <div class="progress"> <div class="progress-bar progress-bar-striped" role="progressbar" ng-class="{\'progress-bar-success\': picFile.progress == 100}" ng-style="{width: picFile.progress + \'%\'}"> {{ picFile.progress }} % </div> </div> <button class="btn btn-primary btn-sm" type="button" ng-click="uploadFile(picFile)" ng-disabled="!picFile || picFile.$error"> {{ "buttons.upload" | translate }} </button> </div> </div> <div ng-messages="uploadForm.$error" ng-messages-multiple=""> <div class="text-danger errorMsg" ng-message="maxSize">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong>. ({{ form.schema[picFile.$error].validationMessage2 | translate }} <strong>{{picFile.size / 1000000|number:1}}MB</strong>)</div> <div class="text-danger errorMsg" ng-message="pattern">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-message="maxItems">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-message="minItems">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-show="errorMsg">{{errorMsg}}</div> </div></script><script type="text/ng-template" id="singleFileUpload.html"><div ngf-drop="selectFile(picFile)" ngf-select="selectFile(picFile)" type="file" ngf-multiple="false" ng-model="picFile" name="file" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" ngf-drag-over-class="dragover" class="drop-box dragAndDropDescription"> <p class="text-center">{{ \'modules.upload.descriptionSinglefile\' | translate }}</p> </div> <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div> <button ngf-select="selectFile(picFile)" type="file" ngf-multiple="false" ng-model="picFile" name="file" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" id="fileInputButton" class="btn btn-primary btn-block {{form.htmlClass}} mt-lg mb"> <fa fw="fw" name="upload" class="mr-sm"></fa> {{ "buttons.add" | translate }} </button></script><script type="text/ng-template" id="multiFileUpload.html"><div ngf-drop="selectFiles(picFiles)" ngf-select="selectFiles(picFiles)" type="file" ngf-multiple="true" ng-model="picFiles" name="files" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" ngf-drag-over-class="dragover" class="drop-box dragAndDropDescription"> <p class="text-center">{{ \'modules.upload.descriptionMultifile\' | translate }}</p> </div> <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div> <button ngf-select="selectFiles(picFiles)" type="file" ngf-multiple="true" multiple ng-model="picFiles" name="files" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" ng-model-options="form.ngModelOptions" id="fileInputButton" class="btn btn-primary btn-block {{form.htmlClass}} mt-lg mb"> <fa fw="fw" name="upload" class="mr-sm"></fa> {{ "buttons.add" | translate }} </button></script>');
}]);
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjaGVtYS1mb3JtLWZpbGUuanMiLCJud3AtZmlsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NoZW1hLWZvcm0tZmlsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbmFuZ3VsYXJcclxuICAgLm1vZHVsZSgnc2NoZW1hRm9ybScpXHJcbiAgIC5jb25maWcoWydzY2hlbWFGb3JtUHJvdmlkZXInLCAnc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlcicsICdzZlBhdGhQcm92aWRlcicsICdzZkJ1aWxkZXJQcm92aWRlcicsXHJcbiAgICAgIGZ1bmN0aW9uIChzY2hlbWFGb3JtUHJvdmlkZXIsIHNjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXIsIHNmUGF0aFByb3ZpZGVyLCBzZkJ1aWxkZXJQcm92aWRlcikge1xyXG4gICAgICAgICAgdmFyIGRlZmF1bHRQYXR0ZXJuTXNnID0gJ1dyb25nIGZpbGUgdHlwZS4gQWxsb3dlZCB0eXBlcyBhcmUgJyxcclxuICAgICAgICAgICAgICBkZWZhdWx0TWF4U2l6ZU1zZzEgPSAnVGhpcyBmaWxlIGlzIHRvbyBsYXJnZS4gTWF4aW11bSBzaXplIGFsbG93ZWQgaXMgJyxcclxuICAgICAgICAgICAgICBkZWZhdWx0TWF4U2l6ZU1zZzIgPSAnQ3VycmVudCBmaWxlIHNpemU6JyxcclxuICAgICAgICAgICAgICBkZWZhdWx0TWluSXRlbXNNc2cgPSAnWW91IGhhdmUgdG8gdXBsb2FkIGF0IGxlYXN0IG9uZSBmaWxlJyxcclxuICAgICAgICAgICAgICBkZWZhdWx0TWF4SXRlbXNNc2cgPSAnWW91IGNhblxcJ3QgdXBsb2FkIG1vcmUgdGhhbiBvbmUgZmlsZS4nLFxyXG4gICAgICAgICAgICAgZGVmYXVsdENodW5rZWRGaWxlU2l6ZSA9IDIwMDAwMDA7IC8vMk1CXHJcblxyXG4gICAgICAgICAgdmFyIG53cFNpbmdsZWZpbGVVcGxvYWQgPSBmdW5jdGlvbiAobmFtZSwgc2NoZW1hLCBvcHRpb25zKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHNjaGVtYS50eXBlID09PSAnYXJyYXknICYmIHNjaGVtYS5mb3JtYXQgPT09ICdzaW5nbGVmaWxlJykge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLnBhdHRlcm4gJiYgc2NoZW1hLnBhdHRlcm4ubWltZVR5cGUgJiYgIXNjaGVtYS5wYXR0ZXJuLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEucGF0dGVybi52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRQYXR0ZXJuTXNnO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWF4U2l6ZSAmJiBzY2hlbWEubWF4U2l6ZS5tYXhpbXVtICYmICFzY2hlbWEubWF4U2l6ZS52YWxpZGF0aW9uTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0TWF4U2l6ZU1zZzE7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWF4U2l6ZS52YWxpZGF0aW9uTWVzc2FnZTIgPSBkZWZhdWx0TWF4U2l6ZU1zZzI7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5taW5JdGVtcyAmJiBzY2hlbWEubWluSXRlbXMubWluaW11bSAmJiAhc2NoZW1hLm1pbkl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWluSXRlbXMudmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0TWluSXRlbXNNc2c7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5tYXhJdGVtcyAmJiBzY2hlbWEubWF4SXRlbXMubWF4aW11bSAmJiAhc2NoZW1hLm1heEl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWF4SXRlbXMudmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0TWF4SXRlbXNNc2c7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQoc2NoZW1hLmNodW5rZWRGaWxlU2l6ZSkgfHwgc2NoZW1hLmNodW5rZWRGaWxlU2l6ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEuY2h1bmtlZEZpbGVTaXplID0gZGVmYXVsdENodW5rZWRGaWxlU2l6ZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICBmLmtleSA9IG9wdGlvbnMucGF0aDtcclxuICAgICAgICAgICAgICAgICAgZi50eXBlID0gJ253cEZpbGVVcGxvYWQnO1xyXG4gICAgICAgICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gZjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIHNjaGVtYUZvcm1Qcm92aWRlci5kZWZhdWx0cy5hcnJheS51bnNoaWZ0KG53cFNpbmdsZWZpbGVVcGxvYWQpO1xyXG5cclxuICAgICAgICAgIHZhciBud3BNdWx0aWZpbGVVcGxvYWQgPSBmdW5jdGlvbiAobmFtZSwgc2NoZW1hLCBvcHRpb25zKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHNjaGVtYS50eXBlID09PSAnYXJyYXknICYmIHNjaGVtYS5mb3JtYXQgPT09ICdtdWx0aWZpbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEucGF0dGVybiAmJiBzY2hlbWEucGF0dGVybi5taW1lVHlwZSAmJiAhc2NoZW1hLnBhdHRlcm4udmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5wYXR0ZXJuLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdFBhdHRlcm5Nc2c7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5tYXhTaXplICYmIHNjaGVtYS5tYXhTaXplLm1heGltdW0gJiYgIXNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWF4U2l6ZS52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRNYXhTaXplTXNnMTtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlMiA9IGRlZmF1bHRNYXhTaXplTXNnMjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLm1pbkl0ZW1zICYmIHNjaGVtYS5taW5JdGVtcy5taW5pbXVtICYmICFzY2hlbWEubWluSXRlbXMudmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5taW5JdGVtcy52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRNaW5JdGVtc01zZztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLm1heEl0ZW1zICYmIHNjaGVtYS5tYXhJdGVtcy5tYXhpbXVtICYmICFzY2hlbWEubWF4SXRlbXMudmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhJdGVtcy52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRNYXhJdGVtc01zZztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChzY2hlbWEuY2h1bmtlZEZpbGVTaXplKSB8fCBzY2hlbWEuY2h1bmtlZEZpbGVTaXplID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5jaHVua2VkRmlsZVNpemUgPSBkZWZhdWx0Q2h1bmtlZEZpbGVTaXplO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICB2YXIgZiA9IHNjaGVtYUZvcm1Qcm92aWRlci5zdGRGb3JtT2JqKG5hbWUsIHNjaGVtYSwgb3B0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICAgIGYua2V5ID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgICAgICAgICAgICAgICBmLnR5cGUgPSAnbndwRmlsZVVwbG9hZCc7XHJcbiAgICAgICAgICAgICAgICAgIG9wdGlvbnMubG9va3VwW3NmUGF0aFByb3ZpZGVyLnN0cmluZ2lmeShvcHRpb25zLnBhdGgpXSA9IGY7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgc2NoZW1hRm9ybVByb3ZpZGVyLmRlZmF1bHRzLmFycmF5LnVuc2hpZnQobndwTXVsdGlmaWxlVXBsb2FkKTtcclxuXHJcbiAgICAgICAgICBzY2hlbWFGb3JtRGVjb3JhdG9yc1Byb3ZpZGVyLmFkZE1hcHBpbmcoXHJcbiAgICAgICAgICAgICAnYm9vdHN0cmFwRGVjb3JhdG9yJyxcclxuICAgICAgICAgICAgICdud3BGaWxlVXBsb2FkJyxcclxuICAgICAgICAgICAgICdkZWNvcmF0b3JzL2Jvb3RzdHJhcC9ud3AtZmlsZS9ud3AtZmlsZS5odG1sJ1xyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIHZhciBzZkZpZWxkID0gc2ZCdWlsZGVyUHJvdmlkZXIuYnVpbGRlcnMuc2ZGaWVsZDtcclxuICAgICAgICAgIHZhciBuZ01vZGVsID0gc2ZCdWlsZGVyUHJvdmlkZXIuYnVpbGRlcnMubmdNb2RlbDtcclxuICAgICAgICAgIHZhciBuZ01vZGVsT3B0aW9ucyA9IHNmQnVpbGRlclByb3ZpZGVyLmJ1aWxkZXJzLm5nTW9kZWxPcHRpb25zO1xyXG4gICAgICAgICAgdmFyIGRlZmF1bHRzID0gW3NmRmllbGQsIG5nTW9kZWxdO1xyXG4gICAgICAgICAgc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlci5kZWZpbmVBZGRPbignYm9vdHN0cmFwRGVjb3JhdG9yJywgJ253cEZpbGVVcGxvYWQnLCAnZGVjb3JhdG9ycy9ib290c3RyYXAvbndwLWZpbGUvbndwLWZpbGUuaHRtbCcsIGRlZmF1bHRzKTtcclxuXHJcbiAgICAgIH1cclxuICAgXSk7XHJcblxyXG5hbmd1bGFyXHJcbiAgIC5tb2R1bGUoJ25nU2NoZW1hRm9ybUZpbGUnLCBbXHJcbiAgICAgICduZ0ZpbGVVcGxvYWQnLFxyXG4gICAgICAnbmdNZXNzYWdlcycsXHJcbiAgICAgICdTU0FUQi5Mb2NhbEZvcmFnZSdcclxuICAgXSlcclxuICAgLmRpcmVjdGl2ZSgnbmdTY2hlbWFGaWxlJywgWydVcGxvYWQnLCAnJHRpbWVvdXQnLCAnJHEnLCAnJGxvY2FsRm9yYWdlJywgJ3NzYXRiSHR0cCcsIGZ1bmN0aW9uIChVcGxvYWQsICR0aW1lb3V0LCAkcSwgJGxvY2FsRm9yYWdlLCBzc2F0Ykh0dHApIHtcclxuICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICBzY29wZTogdHJ1ZSxcclxuICAgICAgICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXHJcbiAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbCkge1xyXG4gICAgICAgICAgICAgICBzY29wZS5zdG9yYWdlRG9tYWluID0gc2NvcGUuZm9ybSAmJiBzY29wZS5mb3JtLnN0b3JhZ2VEb21haW47XHJcbiAgICAgICAgICAgICAgIHNjb3BlLm1ldGFEYXRhID0gc2NvcGUuZm9ybSAmJiBzY29wZS5mb3JtLm1ldGFEYXRhO1xyXG4gICAgICAgICAgICAgICBzY29wZS51cGxvYWRlZEZpbGVzID0gW107XHJcbiAgICAgICAgICAgICAgIHNjb3BlLmFwaUluZm8gPSBnZXRBcGlDb25maWdGcm9tQXBpSW5mbygkbG9jYWxGb3JhZ2UuX2xvY2FsZm9yYWdlLl9jb25maWcuYXBpSW5mbyk7XHJcbiAgICAgICAgICAgICAgIHNjb3BlLmlzU2luZ2xlZmlsZVVwbG9hZCA9IHNjb3BlLmZvcm0gJiYgc2NvcGUuZm9ybS5zY2hlbWEgJiYgc2NvcGUuZm9ybS5zY2hlbWEuZm9ybWF0ID09PSAnc2luZ2xlZmlsZSc7XHJcbiAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZE9uRmlsZVNlbGVjdCA9IHNjb3BlLmZvcm0gJiYgc2NvcGUuZm9ybS51cGxvYWRPbkZpbGVTZWxlY3Q7XHJcbiAgICAgICAgICAgICAgIHNjb3BlLmZpbGVVcGxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgbmdNb2RlbC4kcmVuZGVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgaWYgKG5nTW9kZWwuJG1vZGVsVmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChuZ01vZGVsLiRtb2RlbFZhbHVlLCBmdW5jdGlvbiAoZiwga2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEZpbGVUb0ZpbGVJbmZvKGYpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdEZpbGUgPSBmdW5jdGlvbiAoZmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgc2NvcGUucGljRmlsZSA9IGZpbGU7XHJcbiAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdEZpbGVzID0gZnVuY3Rpb24gKGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICBzY29wZS5waWNGaWxlcyA9IGZpbGVzO1xyXG4gICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZSA9IGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICBmaWxlICYmIGRvVXBsb2FkKGZpbGUpO1xyXG4gICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZXMgPSBmdW5jdGlvbiAoZmlsZXMpIHtcclxuICAgICAgICAgICAgICAgICAgIGZpbGVzLmxlbmd0aCAmJiBhbmd1bGFyLmZvckVhY2goZmlsZXMsIGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgZG9VcGxvYWQoZmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgc2NvcGUuZGVsZXRlRmlsZSA9IGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICB2YXIgYXBpSW5mbyA9IHNjb3BlLmFwaUluZm87XHJcbiAgICAgICAgICAgICAgICAgICB2YXIgdXJsID0gYXBpSW5mby5VcmwgKyBcIi9hcGkvdjEvc3RvcmFnZURvbWFpbnMvXCIgKyBzY29wZS5zdG9yYWdlRG9tYWluICsgXCIvZmlsZXMvXCIgKyBmaWxlLmZpbGVJZDtcclxuICAgICAgICAgICAgICAgICAgIHNzYXRiSHR0cC5kZWxldGUodXJsKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBzY29wZS51cGxvYWRlZEZpbGVzLmluZGV4T2YoZmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkZWRGaWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdWYWx1ZSA9IG5nTW9kZWwuJG1vZGVsVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1JbmRleCA9IG5ld1ZhbHVlLmluZGV4T2YoZmlsZS5maWxlSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChtSW5kZXggIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUuc3BsaWNlKG1JbmRleCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShuZXdWYWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgZnVuY3Rpb24gZ2V0QXBpQ29uZmlnRnJvbUFwaUluZm8oYXBpSW5mb09iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgZm9yICh2YXIgYXBpSW5mbyBpbiBhcGlJbmZvT2JqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlcnZpY2VOYW1lID0gYXBpSW5mb09iamVjdFthcGlJbmZvXS5TZXJ2aWNlTmFtZTtcclxuICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VydmljZU5hbWUgIT0gbnVsbCAmJiBzZXJ2aWNlTmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKSA9PSBcInNzYXRiLmZpbGVzZXJ2aWNlXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcGlJbmZvT2JqZWN0W2FwaUluZm9dO1xyXG4gICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgZnVuY3Rpb24gZ2V0RmlsZUluZm8oZmlsZUlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICB2YXIgYXBpSW5mbyA9IHNjb3BlLmFwaUluZm87XHJcbiAgICAgICAgICAgICAgICAgICB2YXIgdXJsID0gYXBpSW5mby5VcmwgKyBcIi9hcGkvdjEvc3RvcmFnZURvbWFpbnMvXCIgKyBzY29wZS5zdG9yYWdlRG9tYWluICsgXCIvZmlsZXMvXCIgKyBmaWxlSWQ7XHJcbiAgICAgICAgICAgICAgICAgICByZXR1cm4gc3NhdGJIdHRwLmdldCh1cmwpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7IHJldHVybiByZXNwb25zZTsgfSk7XHJcbiAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgZnVuY3Rpb24gYWRkRmlsZVRvRmlsZUluZm8oZmlsZUlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0RmlsZUluZm8oZmlsZUlkKS50aGVuKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgZi5uYW1lID0gZi5wcm9wZXJ0aWVzLmZpbGVOYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZGVkRmlsZXMucHVzaChmKTtcclxuICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIGZ1bmN0aW9uIGRvVXBsb2FkKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdEZpbGUoZmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICB2YXIgYXBpSW5mbyA9IHNjb3BlLmFwaUluZm87XHJcbiAgICAgICAgICAgICAgICAgICBpZiAoZmlsZSAmJiAhZmlsZS4kZXJyb3IgJiYgYXBpSW5mbyAmJiBzY29wZS5zdG9yYWdlRG9tYWluKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVybCA9IGFwaUluZm8uVXJsICsgXCIvYXBpL3YxL3N0b3JhZ2VEb21haW5zL1wiICsgc2NvcGUuc3RvcmFnZURvbWFpbiArIFwiL2ZpbGVzXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSB7IGZpbGU6IGZpbGUgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUubWV0YURhdGEgIT0gbnVsbClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNjb3BlLm1ldGFEYXRhKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVsneC1maWxlLW1ldGFkYXRhLScgKyBrZXldID0gc2NvcGUubWV0YURhdGFba2V5XTtcclxuICAgICAgICAgICAgICAgICAgICAgICB2YXIgdXBsb2FkQ29uZmlnID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBkYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogYXBpSW5mby5IZWFkZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGUuc2l6ZSA+IHNjb3BlLmZvcm0uc2NoZW1hLmNodW5rZWRGaWxlU2l6ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvL0luaXRpYXRlIHRoZSBmaWxlIFVwbG9hZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2h1bmtVcmwgPSBhcGlJbmZvLlVybCArIFwiL2FwaS92MS9zdG9yYWdlRG9tYWlucy9cIiArIHNjb3BlLnN0b3JhZ2VEb21haW4gKyBcIi9jaHVua2VkL2ZpbGVzXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1ldERhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBmaWxlLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbnRlbnQtRGlzcG9zaXRpb25cIjogJ2ZpbGVuYW1lPVwiJyArIGZpbGUubmFtZSArICdcIidcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLm1ldGFEYXRhICE9IG51bGwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gc2NvcGUubWV0YURhdGEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0RGF0YVtrZXldID0gc2NvcGUubWV0YURhdGFba2V5XTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHNzYXRiSHR0cC5wb3N0KGNodW5rVXJsLCBtZXREYXRhKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGVJZCA9IHJlc3BvbnNlLnJlc3BvbnNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ29uZmlnLnJlc3VtZVNpemVVcmwgPSBjaHVua1VybCArIFwiL1wiICsgZmlsZUlkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ29uZmlnLnVybCA9IGNodW5rVXJsICsgXCIvXCIgKyBmaWxlSWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRDb25maWcucmVzdW1lQ2h1bmtTaXplID0gc2NvcGUuZm9ybS5zY2hlbWEuY2h1bmtlZEZpbGVTaXplLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ29uZmlnLnJlc3VtZVNpemVSZXNwb25zZVJlYWRlciA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEucHJvcGVydGllcy5jb250ZW50TGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpY2tPZmZGaWxlVXBsb2FkKGZpbGUsIHVwbG9hZENvbmZpZywgZmlsZUlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUudXBsb2FkLnByb2dyZXNzKGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnByb2dyZXNzID0gTWF0aC5taW4oMTAwLCBwYXJzZUludCgxMDAuMCAqXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAga2lja09mZkZpbGVVcGxvYWQoZmlsZSwgdXBsb2FkQ29uZmlnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS51cGxvYWQucHJvZ3Jlc3MoZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IE1hdGgubWluKDEwMCwgcGFyc2VJbnQoMTAwLjAgKlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgZnVuY3Rpb24ga2lja09mZkZpbGVVcGxvYWQoZmlsZSwgdXBsb2FkQ29uZmlnLCBmaWxlSWQpIHtcclxuICAgICAgICAgICAgICAgICAgIGZpbGUudXBsb2FkID0gVXBsb2FkLnVwbG9hZCh1cGxvYWRDb25maWcpO1xyXG4gICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsZVVwbG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICBmaWxlLnVwbG9hZC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5yZXN1bHQgPSByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKG5nTW9kZWwuJG1vZGVsVmFsdWUpIHx8IG5nTW9kZWwuJG1vZGVsVmFsdWUgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKFtdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3VmFsdWUgPSBuZ01vZGVsLiRtb2RlbFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKGZpbGVJZCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVJZCA9IHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUucHVzaChmaWxlSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShuZXdWYWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgbmdNb2RlbC4kY29tbWl0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgYWRkRmlsZVRvRmlsZUluZm8oZmlsZUlkKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsZVVwbG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5lcnJvck1zZyA9IHJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICBzY29wZS52YWxpZGF0ZUZpZWxkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZSAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGUuJHZhbGlkICYmIHNjb3BlLnBpY0ZpbGUgJiYgIXNjb3BlLnBpY0ZpbGUuJGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZWZpbGUtZm9ybSBpcyBpbnZhbGlkJyk7XHJcbiAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlcy4kdmFsaWQgJiYgc2NvcGUucGljRmlsZXMgJiYgIXNjb3BlLnBpY0ZpbGVzLiRlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtdWx0aWZpbGUtZm9ybSBpcyAgaW52YWxpZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlLSBhbmQgbXVsdGlmaWxlLWZvcm0gYXJlIHZhbGlkJyk7XHJcbiAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgIHNjb3BlLnN1Ym1pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgIGlmIChzY29wZS51cGxvYWRGb3JtLmZpbGUgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlICYmICFzY29wZS5waWNGaWxlLiRlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGUoc2NvcGUucGljRmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlcy4kdmFsaWQgJiYgc2NvcGUucGljRmlsZXMgJiYgIXNjb3BlLnBpY0ZpbGVzLiRlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzKHNjb3BlLnBpY0ZpbGVzKTtcclxuICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdzY2hlbWFGb3JtVmFsaWRhdGUnLCBzY29wZS52YWxpZGF0ZUZpZWxkKTtcclxuICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdzY2hlbWFGb3JtRmlsZVVwbG9hZFN1Ym1pdCcsIHNjb3BlLnN1Ym1pdCk7XHJcbiAgICAgICAgICAgfVxyXG4gICAgICAgfTtcclxuICAgfV0pO1xyXG4iLG51bGxdfQ==
