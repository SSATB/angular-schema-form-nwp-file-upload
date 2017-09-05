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
             'directives/decorators/bootstrap/nwp-file/nwp-file.html'
          );
        //   var sfField = sfBuilderProvider.builders.sfField;
        //   var ngModel = sfBuilderProvider.builders.ngModel;
        //   var ngModelOptions = sfBuilderProvider.builders.ngModelOptions;
        //   var defaults = [sfField, ngModel];
          var defaults = sfBuilderProvider.stdBuilders;
          schemaFormDecoratorsProvider.defineAddOn('bootstrapDecorator', 'nwpFileUpload', 'directives/decorators/bootstrap/nwp-file/nwp-file.html', defaults);

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
                       scope.uploadedFiles = [];
                       angular.forEach(ngModel.$modelValue, function (f, key) {
                           addFileToFileInfo(f)
                       });
                   }
               }

               scope.selectFile = function (file) {
                   scope.errorMsg = '';
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
//                   var url = apiInfo.Url + "/api/v1/storageDomains/" + scope.storageDomain + "/files/" + file.fileId;
//                   ssatbHttp.delete(url).then(function () {
                       var index = scope.uploadedFiles.indexOf(file);
                       scope.uploadedFiles.splice(index, 1);
                       var newValue = ngModel.$modelValue;
                       var mIndex = newValue.indexOf(file.fileId);
                       if (mIndex != -1) {
                           newValue.splice(mIndex, 1);
                           ngModel.$setViewValue(newValue);
                           ngModel.$commitViewValue();
                       }
//                   })
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
                       if (response.status > 0 && response.data) {
                           scope.errorMsg = response.data;
                       }
                       else { scope.errorMsg = "Errors uploading your file"; }
                       file.upload.abort();
                       scope.fileUploading = false;
                       file.progress = 0;
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
    '<ng-form class="file-upload mb-lg" ng-schema-file="" ng-model="$$value$$" sf-field-model="" sf-changed="uploadForm" schema-validate="uploadForm" name="uploadForm"><label ng-show="form.title && form.notitle !== true" class="control-label" for="fileInputButton" ng-class="{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}">{{ form.title }}<i ng-show="form.required">&nbsp;*</i></label><div ng-hide="uploadOnFileSelect"><div ng-show="picFile"><div ng-include="\'uploadProcess.html\'" class="mb"></div></div><ul ng-show="picFiles && picFiles.length" class="list-group"><li class="list-group-item" ng-repeat="picFile in picFiles"><div ng-include="\'uploadProcess.html\'"></div></li></ul></div><div class="bg-white mb" ng-class="{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}"><small class="text-muted" ng-show="form.description" ng-bind-html="form.description"></small><div ng-if="isSinglefileUpload" ng-include="" src="form.templateUrlFileUpload ? form.templateUrlFileUpload : \'singleFileUpload.html\'"></div><div ng-if="!isSinglefileUpload" ng-include="form.templateUrlFileUpload ? form.templateUrlFileUpload : \'multiFileUpload.html\'"></div><div class="help-block mb0" ng-show="uploadForm.$error.required && !uploadForm.$pristine">{{ \'modules.attribute.fields.required.caption\' | translate }}</div><div class="help-block mb0" ng-show="(hasError() && errorMessage(schemaError()))" ng-bind-html="(hasError() && errorMessage(schemaError()))"></div></div></ng-form><script type="text/ng-template" id="partials/simpleFileUpload.html"><div class="row"> <div class="col-sm-2 {{ uploadedFiles.length >= form.schema.maxItems.maximum ? \'attachment-button-disabled\' : \'attachment-button\' }}" title="{{ uploadedFiles.length >= form.schema.maxItems.maximum && form.schema.maxItems.warningMessage ? form.schema.maxItems.warningMessage : \'\' }}"> <a href ngf-select="uploadFile(picFile)" type="file" ngf-multiple="false" ng-model="picFile" name="file" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" id="fileInputlink" class="ui icon"> <span style="padding-top:0px; margin-top:0px;" class="ion-paperclip"></span> </a> </div> <div class="col-sm-4 uploaded-files"> <div class="{{form.htmlClassUploadedFiles}}" ng-repeat="uploadedFile in uploadedFiles"> <a href="{{ uploadedFile.downloadUrl }}" download>{{ uploadedFile.name }}</a> <a href> <span ng-click="deleteFile(uploadedFile)" class="glyphicon glyphicon-remove"></span> </a> </div> </div> <div ng-show="fileUploading" class="col-sm-4 mb-sm"> <div class="filename" title="{{ picFile.name }}">{{ picFile.name }}</div> </div> <div ng-show="fileUploading" class="col-sm-4 mb-sm"> <div class="progress"> <div class="progress-bar progress-bar-striped" role="progressbar" ng-class="{\'progress-bar-success\': picFile.progress == 100}" ng-style="{width: picFile.progress + \'%\'}"> {{ picFile.progress }} % </div> </div> </div> <div ng-messages="uploadForm.$error" ng-messages-multiple=""> <div class="text-danger errorMsg" ng-message="maxSize">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong>. ({{ form.schema[picFile.$error].validationMessage2 | translate }} <strong>{{picFile.size / 1000000|number:1}}MB</strong>)</div> <div class="text-danger errorMsg" ng-message="pattern">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-message="maxItems">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-message="minItems">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-show="errorMsg">{{errorMsg}}</div> </div> </div></script><script type="text/ng-template" id="uploadProcess.html"><div class="row mb"> <div class="col-sm-4 mb-sm"> <label title="{{ \'modules.upload.field.preview\' | translate }}" class="text-info"> {{ \'modules.upload.field.preview\' | translate }} </label> <img ngf-src="picFile" class="img-thumbnail img-responsive"> <div class="img-placeholder" ng-class="{\'show\': picFile.$invalid && !picFile.blobUrl, \'hide\': !picFile || picFile.blobUrl}"> No preview available </div> </div> <div class="col-sm-4 mb-sm"> <label title="{{ \'modules.upload.field.filename\' | translate }}" class="text-info"> {{ \'modules.upload.field.filename\' | translate }} </label> <div class="filename" title="{{ picFile.name }}">{{ picFile.name }}</div> </div> <div class="col-sm-4 mb-sm"> <label title="{{ \'modules.upload.field.progress\' | translate }}" class="text-info"> {{ \'modules.upload.field.progress\' | translate }} </label> <div class="progress"> <div class="progress-bar progress-bar-striped" role="progressbar" ng-class="{\'progress-bar-success\': picFile.progress == 100}" ng-style="{width: picFile.progress + \'%\'}"> {{ picFile.progress }} % </div> </div> <button class="btn btn-primary btn-sm" type="button" ng-click="uploadFile(picFile)" ng-disabled="!picFile || picFile.$error"> {{ "buttons.upload" | translate }} </button> </div> </div> <div ng-messages="uploadForm.$error" ng-messages-multiple=""> <div class="text-danger errorMsg" ng-message="maxSize">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong>. ({{ form.schema[picFile.$error].validationMessage2 | translate }} <strong>{{picFile.size / 1000000|number:1}}MB</strong>)</div> <div class="text-danger errorMsg" ng-message="pattern">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-message="maxItems">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-message="minItems">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div> <div class="text-danger errorMsg" ng-show="errorMsg">{{errorMsg}}</div> </div></script><script type="text/ng-template" id="singleFileUpload.html"><div ngf-drop="selectFile(picFile)" ngf-select="selectFile(picFile)" type="file" ngf-multiple="false" ng-model="picFile" name="file" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" ngf-drag-over-class="dragover" class="drop-box dragAndDropDescription"> <p class="text-center">{{ \'modules.upload.descriptionSinglefile\' | translate }}</p> </div> <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div> <button ngf-select="selectFile(picFile)" type="file" ngf-multiple="false" ng-model="picFile" name="file" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" id="fileInputButton" class="btn btn-primary btn-block {{form.htmlClass}} mt-lg mb"> <fa fw="fw" name="upload" class="mr-sm"></fa> {{ "buttons.add" | translate }} </button></script><script type="text/ng-template" id="multiFileUpload.html"><div ngf-drop="selectFiles(picFiles)" ngf-select="selectFiles(picFiles)" type="file" ngf-multiple="true" ng-model="picFiles" name="files" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-model-options="form.ngModelOptions" ngf-drag-over-class="dragover" class="drop-box dragAndDropDescription"> <p class="text-center">{{ \'modules.upload.descriptionMultifile\' | translate }}</p> </div> <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div> <button ngf-select="selectFiles(picFiles)" type="file" ngf-multiple="true" multiple ng-model="picFiles" name="files" accept="{{form.schema.pattern && form.schema.pattern.mimeType}}" ng-attr-ngf-pattern="{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}" ng-attr-ngf-max-size="{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}" ng-required="form.required" ng-model-options="form.ngModelOptions" id="fileInputButton" class="btn btn-primary btn-block {{form.htmlClass}} mt-lg mb"> <fa fw="fw" name="upload" class="mr-sm"></fa> {{ "buttons.add" | translate }} </button></script>');
}]);
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjaGVtYS1mb3JtLWZpbGUuanMiLCJud3AtZmlsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDelFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY2hlbWEtZm9ybS1maWxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5cclxuYW5ndWxhclxyXG4gICAubW9kdWxlKCdzY2hlbWFGb3JtJylcclxuICAgLmNvbmZpZyhbJ3NjaGVtYUZvcm1Qcm92aWRlcicsICdzY2hlbWFGb3JtRGVjb3JhdG9yc1Byb3ZpZGVyJywgJ3NmUGF0aFByb3ZpZGVyJywgJ3NmQnVpbGRlclByb3ZpZGVyJyxcclxuICAgICAgZnVuY3Rpb24gKHNjaGVtYUZvcm1Qcm92aWRlciwgc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlciwgc2ZQYXRoUHJvdmlkZXIsIHNmQnVpbGRlclByb3ZpZGVyKSB7XHJcbiAgICAgICAgICB2YXIgZGVmYXVsdFBhdHRlcm5Nc2cgPSAnV3JvbmcgZmlsZSB0eXBlLiBBbGxvd2VkIHR5cGVzIGFyZSAnLFxyXG4gICAgICAgICAgICAgIGRlZmF1bHRNYXhTaXplTXNnMSA9ICdUaGlzIGZpbGUgaXMgdG9vIGxhcmdlLiBNYXhpbXVtIHNpemUgYWxsb3dlZCBpcyAnLFxyXG4gICAgICAgICAgICAgIGRlZmF1bHRNYXhTaXplTXNnMiA9ICdDdXJyZW50IGZpbGUgc2l6ZTonLFxyXG4gICAgICAgICAgICAgIGRlZmF1bHRNaW5JdGVtc01zZyA9ICdZb3UgaGF2ZSB0byB1cGxvYWQgYXQgbGVhc3Qgb25lIGZpbGUnLFxyXG4gICAgICAgICAgICAgIGRlZmF1bHRNYXhJdGVtc01zZyA9ICdZb3UgY2FuXFwndCB1cGxvYWQgbW9yZSB0aGFuIG9uZSBmaWxlLicsXHJcbiAgICAgICAgICAgICBkZWZhdWx0Q2h1bmtlZEZpbGVTaXplID0gMjAwMDAwMDsgLy8yTUJcclxuXHJcbiAgICAgICAgICB2YXIgbndwU2luZ2xlZmlsZVVwbG9hZCA9IGZ1bmN0aW9uIChuYW1lLCBzY2hlbWEsIG9wdGlvbnMpIHtcclxuICAgICAgICAgICAgICBpZiAoc2NoZW1hLnR5cGUgPT09ICdhcnJheScgJiYgc2NoZW1hLmZvcm1hdCA9PT0gJ3NpbmdsZWZpbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEucGF0dGVybiAmJiBzY2hlbWEucGF0dGVybi5taW1lVHlwZSAmJiAhc2NoZW1hLnBhdHRlcm4udmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5wYXR0ZXJuLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdFBhdHRlcm5Nc2c7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5tYXhTaXplICYmIHNjaGVtYS5tYXhTaXplLm1heGltdW0gJiYgIXNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWF4U2l6ZS52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRNYXhTaXplTXNnMTtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlMiA9IGRlZmF1bHRNYXhTaXplTXNnMjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLm1pbkl0ZW1zICYmIHNjaGVtYS5taW5JdGVtcy5taW5pbXVtICYmICFzY2hlbWEubWluSXRlbXMudmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5taW5JdGVtcy52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRNaW5JdGVtc01zZztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLm1heEl0ZW1zICYmIHNjaGVtYS5tYXhJdGVtcy5tYXhpbXVtICYmICFzY2hlbWEubWF4SXRlbXMudmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhJdGVtcy52YWxpZGF0aW9uTWVzc2FnZSA9IGRlZmF1bHRNYXhJdGVtc01zZztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChzY2hlbWEuY2h1bmtlZEZpbGVTaXplKSB8fCBzY2hlbWEuY2h1bmtlZEZpbGVTaXplID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5jaHVua2VkRmlsZVNpemUgPSBkZWZhdWx0Q2h1bmtlZEZpbGVTaXplO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICB2YXIgZiA9IHNjaGVtYUZvcm1Qcm92aWRlci5zdGRGb3JtT2JqKG5hbWUsIHNjaGVtYSwgb3B0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICAgIGYua2V5ID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgICAgICAgICAgICAgICBmLnR5cGUgPSAnbndwRmlsZVVwbG9hZCc7XHJcbiAgICAgICAgICAgICAgICAgIG9wdGlvbnMubG9va3VwW3NmUGF0aFByb3ZpZGVyLnN0cmluZ2lmeShvcHRpb25zLnBhdGgpXSA9IGY7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgc2NoZW1hRm9ybVByb3ZpZGVyLmRlZmF1bHRzLmFycmF5LnVuc2hpZnQobndwU2luZ2xlZmlsZVVwbG9hZCk7XHJcblxyXG4gICAgICAgICAgdmFyIG53cE11bHRpZmlsZVVwbG9hZCA9IGZ1bmN0aW9uIChuYW1lLCBzY2hlbWEsIG9wdGlvbnMpIHtcclxuICAgICAgICAgICAgICBpZiAoc2NoZW1hLnR5cGUgPT09ICdhcnJheScgJiYgc2NoZW1hLmZvcm1hdCA9PT0gJ211bHRpZmlsZScpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5wYXR0ZXJuICYmIHNjaGVtYS5wYXR0ZXJuLm1pbWVUeXBlICYmICFzY2hlbWEucGF0dGVybi52YWxpZGF0aW9uTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLnBhdHRlcm4udmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0UGF0dGVybk1zZztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLm1heFNpemUgJiYgc2NoZW1hLm1heFNpemUubWF4aW11bSAmJiAhc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1heFNpemVNc2cxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UyID0gZGVmYXVsdE1heFNpemVNc2cyO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWluSXRlbXMgJiYgc2NoZW1hLm1pbkl0ZW1zLm1pbmltdW0gJiYgIXNjaGVtYS5taW5JdGVtcy52YWxpZGF0aW9uTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1pbkl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1pbkl0ZW1zTXNnO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWF4SXRlbXMgJiYgc2NoZW1hLm1heEl0ZW1zLm1heGltdW0gJiYgIXNjaGVtYS5tYXhJdGVtcy52YWxpZGF0aW9uTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1heEl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1heEl0ZW1zTXNnO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKHNjaGVtYS5jaHVua2VkRmlsZVNpemUpIHx8IHNjaGVtYS5jaHVua2VkRmlsZVNpemUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLmNodW5rZWRGaWxlU2l6ZSA9IGRlZmF1bHRDaHVua2VkRmlsZVNpemU7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIHZhciBmID0gc2NoZW1hRm9ybVByb3ZpZGVyLnN0ZEZvcm1PYmoobmFtZSwgc2NoZW1hLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgICAgICAgZi5rZXkgPSBvcHRpb25zLnBhdGg7XHJcbiAgICAgICAgICAgICAgICAgIGYudHlwZSA9ICdud3BGaWxlVXBsb2FkJztcclxuICAgICAgICAgICAgICAgICAgb3B0aW9ucy5sb29rdXBbc2ZQYXRoUHJvdmlkZXIuc3RyaW5naWZ5KG9wdGlvbnMucGF0aCldID0gZjtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGY7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICBzY2hlbWFGb3JtUHJvdmlkZXIuZGVmYXVsdHMuYXJyYXkudW5zaGlmdChud3BNdWx0aWZpbGVVcGxvYWQpO1xyXG5cclxuICAgICAgICAgIHNjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXIuYWRkTWFwcGluZyhcclxuICAgICAgICAgICAgICdib290c3RyYXBEZWNvcmF0b3InLFxyXG4gICAgICAgICAgICAgJ253cEZpbGVVcGxvYWQnLFxyXG4gICAgICAgICAgICAgJ2RpcmVjdGl2ZXMvZGVjb3JhdG9ycy9ib290c3RyYXAvbndwLWZpbGUvbndwLWZpbGUuaHRtbCdcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgLy8gICB2YXIgc2ZGaWVsZCA9IHNmQnVpbGRlclByb3ZpZGVyLmJ1aWxkZXJzLnNmRmllbGQ7XHJcbiAgICAgICAgLy8gICB2YXIgbmdNb2RlbCA9IHNmQnVpbGRlclByb3ZpZGVyLmJ1aWxkZXJzLm5nTW9kZWw7XHJcbiAgICAgICAgLy8gICB2YXIgbmdNb2RlbE9wdGlvbnMgPSBzZkJ1aWxkZXJQcm92aWRlci5idWlsZGVycy5uZ01vZGVsT3B0aW9ucztcclxuICAgICAgICAvLyAgIHZhciBkZWZhdWx0cyA9IFtzZkZpZWxkLCBuZ01vZGVsXTtcclxuICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHNmQnVpbGRlclByb3ZpZGVyLnN0ZEJ1aWxkZXJzO1xyXG4gICAgICAgICAgc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlci5kZWZpbmVBZGRPbignYm9vdHN0cmFwRGVjb3JhdG9yJywgJ253cEZpbGVVcGxvYWQnLCAnZGlyZWN0aXZlcy9kZWNvcmF0b3JzL2Jvb3RzdHJhcC9ud3AtZmlsZS9ud3AtZmlsZS5odG1sJywgZGVmYXVsdHMpO1xyXG5cclxuICAgICAgfVxyXG4gICBdKTtcclxuXHJcbmFuZ3VsYXJcclxuICAgLm1vZHVsZSgnbmdTY2hlbWFGb3JtRmlsZScsIFtcclxuICAgICAgJ25nRmlsZVVwbG9hZCcsXHJcbiAgICAgICduZ01lc3NhZ2VzJyxcclxuICAgICAgJ1NTQVRCLkxvY2FsRm9yYWdlJ1xyXG4gICBdKVxyXG4gICAuZGlyZWN0aXZlKCduZ1NjaGVtYUZpbGUnLCBbJ1VwbG9hZCcsICckdGltZW91dCcsICckcScsICckbG9jYWxGb3JhZ2UnLCAnc3NhdGJIdHRwJywgZnVuY3Rpb24gKFVwbG9hZCwgJHRpbWVvdXQsICRxLCAkbG9jYWxGb3JhZ2UsIHNzYXRiSHR0cCkge1xyXG4gICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgIHNjb3BlOiB0cnVlLFxyXG4gICAgICAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcclxuICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBuZ01vZGVsKSB7XHJcbiAgICAgICAgICAgICAgIHNjb3BlLnN0b3JhZ2VEb21haW4gPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0uc3RvcmFnZURvbWFpbjtcclxuICAgICAgICAgICAgICAgc2NvcGUubWV0YURhdGEgPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0ubWV0YURhdGE7XHJcbiAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZGVkRmlsZXMgPSBbXTtcclxuICAgICAgICAgICAgICAgc2NvcGUuYXBpSW5mbyA9IGdldEFwaUNvbmZpZ0Zyb21BcGlJbmZvKCRsb2NhbEZvcmFnZS5fbG9jYWxmb3JhZ2UuX2NvbmZpZy5hcGlJbmZvKTtcclxuICAgICAgICAgICAgICAgc2NvcGUuaXNTaW5nbGVmaWxlVXBsb2FkID0gc2NvcGUuZm9ybSAmJiBzY29wZS5mb3JtLnNjaGVtYSAmJiBzY29wZS5mb3JtLnNjaGVtYS5mb3JtYXQgPT09ICdzaW5nbGVmaWxlJztcclxuICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkT25GaWxlU2VsZWN0ID0gc2NvcGUuZm9ybSAmJiBzY29wZS5mb3JtLnVwbG9hZE9uRmlsZVNlbGVjdDtcclxuICAgICAgICAgICAgICAgc2NvcGUuZmlsZVVwbG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICBuZ01vZGVsLiRyZW5kZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICBpZiAobmdNb2RlbC4kbW9kZWxWYWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkZWRGaWxlcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChuZ01vZGVsLiRtb2RlbFZhbHVlLCBmdW5jdGlvbiAoZiwga2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEZpbGVUb0ZpbGVJbmZvKGYpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdEZpbGUgPSBmdW5jdGlvbiAoZmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgc2NvcGUuZXJyb3JNc2cgPSAnJztcclxuICAgICAgICAgICAgICAgICAgIHNjb3BlLnBpY0ZpbGUgPSBmaWxlO1xyXG4gICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICBzY29wZS5zZWxlY3RGaWxlcyA9IGZ1bmN0aW9uIChmaWxlcykge1xyXG4gICAgICAgICAgICAgICAgICAgc2NvcGUucGljRmlsZXMgPSBmaWxlcztcclxuICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGUgPSBmdW5jdGlvbiAoZmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgZmlsZSAmJiBkb1VwbG9hZChmaWxlKTtcclxuICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzID0gZnVuY3Rpb24gKGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICBmaWxlcy5sZW5ndGggJiYgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCBmdW5jdGlvbiAoZmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGRvVXBsb2FkKGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgIHNjb3BlLmRlbGV0ZUZpbGUgPSBmdW5jdGlvbiAoZmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgdmFyIGFwaUluZm8gPSBzY29wZS5hcGlJbmZvO1xyXG4vLyAgICAgICAgICAgICAgICAgICB2YXIgdXJsID0gYXBpSW5mby5VcmwgKyBcIi9hcGkvdjEvc3RvcmFnZURvbWFpbnMvXCIgKyBzY29wZS5zdG9yYWdlRG9tYWluICsgXCIvZmlsZXMvXCIgKyBmaWxlLmZpbGVJZDtcclxuLy8gICAgICAgICAgICAgICAgICAgc3NhdGJIdHRwLmRlbGV0ZSh1cmwpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHNjb3BlLnVwbG9hZGVkRmlsZXMuaW5kZXhPZihmaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICBzY29wZS51cGxvYWRlZEZpbGVzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gbmdNb2RlbC4kbW9kZWxWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICB2YXIgbUluZGV4ID0gbmV3VmFsdWUuaW5kZXhPZihmaWxlLmZpbGVJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1JbmRleCAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdWYWx1ZS5zcGxpY2UobUluZGV4LCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKG5ld1ZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbmdNb2RlbC4kY29tbWl0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4vLyAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIGZ1bmN0aW9uIGdldEFwaUNvbmZpZ0Zyb21BcGlJbmZvKGFwaUluZm9PYmplY3QpIHtcclxuICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGFwaUluZm8gaW4gYXBpSW5mb09iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHZhciBzZXJ2aWNlTmFtZSA9IGFwaUluZm9PYmplY3RbYXBpSW5mb10uU2VydmljZU5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlcnZpY2VOYW1lICE9IG51bGwgJiYgc2VydmljZU5hbWUudG9Mb3dlckNhc2UoKS50cmltKCkgPT0gXCJzc2F0Yi5maWxlc2VydmljZVwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXBpSW5mb09iamVjdFthcGlJbmZvXTtcclxuICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIGZ1bmN0aW9uIGdldEZpbGVJbmZvKGZpbGVJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgdmFyIGFwaUluZm8gPSBzY29wZS5hcGlJbmZvO1xyXG4gICAgICAgICAgICAgICAgICAgdmFyIHVybCA9IGFwaUluZm8uVXJsICsgXCIvYXBpL3YxL3N0b3JhZ2VEb21haW5zL1wiICsgc2NvcGUuc3RvcmFnZURvbWFpbiArIFwiL2ZpbGVzL1wiICsgZmlsZUlkO1xyXG4gICAgICAgICAgICAgICAgICAgcmV0dXJuIHNzYXRiSHR0cC5nZXQodXJsKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkgeyByZXR1cm4gcmVzcG9uc2U7IH0pO1xyXG4gICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIGZ1bmN0aW9uIGFkZEZpbGVUb0ZpbGVJbmZvKGZpbGVJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldEZpbGVJbmZvKGZpbGVJZCkudGhlbihmdW5jdGlvbiAoZikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGYubmFtZSA9IGYucHJvcGVydGllcy5maWxlTmFtZTtcclxuICAgICAgICAgICAgICAgICAgICAgICBzY29wZS51cGxvYWRlZEZpbGVzLnB1c2goZik7XHJcbiAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICBmdW5jdGlvbiBkb1VwbG9hZChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICBzY29wZS5zZWxlY3RGaWxlKGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgdmFyIGFwaUluZm8gPSBzY29wZS5hcGlJbmZvO1xyXG4gICAgICAgICAgICAgICAgICAgaWYgKGZpbGUgJiYgIWZpbGUuJGVycm9yICYmIGFwaUluZm8gJiYgc2NvcGUuc3RvcmFnZURvbWFpbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHZhciB1cmwgPSBhcGlJbmZvLlVybCArIFwiL2FwaS92MS9zdG9yYWdlRG9tYWlucy9cIiArIHNjb3BlLnN0b3JhZ2VEb21haW4gKyBcIi9maWxlc1wiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0geyBmaWxlOiBmaWxlIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLm1ldGFEYXRhICE9IG51bGwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzY29wZS5tZXRhRGF0YSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbJ3gtZmlsZS1tZXRhZGF0YS0nICsga2V5XSA9IHNjb3BlLm1ldGFEYXRhW2tleV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVwbG9hZENvbmZpZyA9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IGFwaUluZm8uSGVhZGVyc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlLnNpemUgPiBzY29wZS5mb3JtLnNjaGVtYS5jaHVua2VkRmlsZVNpemUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9Jbml0aWF0ZSB0aGUgZmlsZSBVcGxvYWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNodW5rVXJsID0gYXBpSW5mby5VcmwgKyBcIi9hcGkvdjEvc3RvcmFnZURvbWFpbnMvXCIgKyBzY29wZS5zdG9yYWdlRG9tYWluICsgXCIvY2h1bmtlZC9maWxlc1wiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogZmlsZS50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb250ZW50LURpc3Bvc2l0aW9uXCI6ICdmaWxlbmFtZT1cIicgKyBmaWxlLm5hbWUgKyAnXCInXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY29wZS5tZXRhRGF0YSAhPSBudWxsKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNjb3BlLm1ldGFEYXRhKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldERhdGFba2V5XSA9IHNjb3BlLm1ldGFEYXRhW2tleV07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzc2F0Ykh0dHAucG9zdChjaHVua1VybCwgbWV0RGF0YSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmaWxlSWQgPSByZXNwb25zZS5yZXNwb25zZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZENvbmZpZy5yZXN1bWVTaXplVXJsID0gY2h1bmtVcmwgKyBcIi9cIiArIGZpbGVJZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZENvbmZpZy51cmwgPSBjaHVua1VybCArIFwiL1wiICsgZmlsZUlkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ29uZmlnLnJlc3VtZUNodW5rU2l6ZSA9IHNjb3BlLmZvcm0uc2NoZW1hLmNodW5rZWRGaWxlU2l6ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZENvbmZpZy5yZXN1bWVTaXplUmVzcG9uc2VSZWFkZXIgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLnByb3BlcnRpZXMuY29udGVudExlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBraWNrT2ZmRmlsZVVwbG9hZChmaWxlLCB1cGxvYWRDb25maWcsIGZpbGVJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnVwbG9hZC5wcm9ncmVzcyhmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IE1hdGgubWluKDEwMCwgcGFyc2VJbnQoMTAwLjAgKlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5sb2FkZWQgLyBldnQudG90YWwpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpY2tPZmZGaWxlVXBsb2FkKGZpbGUsIHVwbG9hZENvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUudXBsb2FkLnByb2dyZXNzKGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUucHJvZ3Jlc3MgPSBNYXRoLm1pbigxMDAsIHBhcnNlSW50KDEwMC4wICpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5sb2FkZWQgLyBldnQudG90YWwpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIGZ1bmN0aW9uIGtpY2tPZmZGaWxlVXBsb2FkKGZpbGUsIHVwbG9hZENvbmZpZywgZmlsZUlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICBmaWxlLnVwbG9hZCA9IFVwbG9hZC51cGxvYWQodXBsb2FkQ29uZmlnKTtcclxuICAgICAgICAgICAgICAgICAgIHNjb3BlLmZpbGVVcGxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgZmlsZS51cGxvYWQudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUucmVzdWx0ID0gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChuZ01vZGVsLiRtb2RlbFZhbHVlKSB8fCBuZ01vZGVsLiRtb2RlbFZhbHVlID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShbXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gbmdNb2RlbC4kbW9kZWxWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChmaWxlSWQpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlSWQgPSByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIG5ld1ZhbHVlLnB1c2goZmlsZUlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUobmV3VmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGFkZEZpbGVUb0ZpbGVJbmZvKGZpbGVJZCkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmZpbGVVcGxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+IDAgJiYgcmVzcG9uc2UuZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5lcnJvck1zZyA9IHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgIGVsc2UgeyBzY29wZS5lcnJvck1zZyA9IFwiRXJyb3JzIHVwbG9hZGluZyB5b3VyIGZpbGVcIjsgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgIGZpbGUudXBsb2FkLmFib3J0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsZVVwbG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGZpbGUucHJvZ3Jlc3MgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgIHNjb3BlLnZhbGlkYXRlRmllbGQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZS4kdmFsaWQgJiYgc2NvcGUucGljRmlsZSAmJiAhc2NvcGUucGljRmlsZS4kZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlZmlsZS1mb3JtIGlzIGludmFsaWQnKTtcclxuICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlcyAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGVzLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlcyAmJiAhc2NvcGUucGljRmlsZXMuJGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ211bHRpZmlsZS1mb3JtIGlzICBpbnZhbGlkJyk7XHJcbiAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUtIGFuZCBtdWx0aWZpbGUtZm9ybSBhcmUgdmFsaWQnKTtcclxuICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZSAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGUuJHZhbGlkICYmIHNjb3BlLnBpY0ZpbGUgJiYgIXNjb3BlLnBpY0ZpbGUuJGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZShzY29wZS5waWNGaWxlKTtcclxuICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlcyAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGVzLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlcyAmJiAhc2NvcGUucGljRmlsZXMuJGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZXMoc2NvcGUucGljRmlsZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICBzY29wZS4kb24oJ3NjaGVtYUZvcm1WYWxpZGF0ZScsIHNjb3BlLnZhbGlkYXRlRmllbGQpO1xyXG4gICAgICAgICAgICAgICBzY29wZS4kb24oJ3NjaGVtYUZvcm1GaWxlVXBsb2FkU3VibWl0Jywgc2NvcGUuc3VibWl0KTtcclxuICAgICAgICAgICB9XHJcbiAgICAgICB9O1xyXG4gICB9XSk7XHJcbiIsbnVsbF19
