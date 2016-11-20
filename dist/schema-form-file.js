/**
 * angular-schema-form-nwp-file-upload - Upload file type for Angular Schema Form
 * @version v0.1.5
 * @link https://github.com/saburab/angular-schema-form-nwp-file-upload
 * @license MIT
 */
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
            defaultChunkedFileSize = 10000;

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
                ssatbHttp.delete(url).then(function () { var index = scope.uploadedFiles.indexOf(file); scope.uploadedFiles.splice(index, 1); })
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
                    f.name = f.properties.contentDisposition;
                    if (f.name.indexOf("filename=") == 0)
                        f.name = f.name.substring(9);
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
                    var newValue = ngModel.$modelValue;
                    if (!angular.isDefined(newValue))
                        newValue = [];
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

angular.module("schemaForm").run(["$templateCache", function($templateCache) {$templateCache.put("directives/decorators/bootstrap/nwp-file/nwp-file.html","<ng-form class=\"file-upload mb-lg\" ng-schema-file ng-model=\"$$value$$\" name=\"uploadForm\">\r\n   <label ng-show=\"form.title && form.notitle !== true\" class=\"control-label\" for=\"fileInputButton\" ng-class=\"{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}\">\r\n      {{ form.title }}<i ng-show=\"form.required\">&nbsp;*</i>\r\n   </label>\r\n    <div ng-hide=\"uploadOnFileSelect\">\r\n        <div ng-show=\"picFile\">\r\n            <div ng-include=\"\'uploadProcess.html\'\" class=\"mb\"></div>\r\n        </div>\r\n\r\n        <ul ng-show=\"picFiles && picFiles.length\" class=\"list-group\">\r\n            <li class=\"list-group-item\" ng-repeat=\"picFile in picFiles\">\r\n                <div ng-include=\"\'uploadProcess.html\'\"></div>\r\n            </li>\r\n        </ul>\r\n    </div>\r\n\r\n   <div class=\"bg-white mb\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n      <small class=\"text-muted\" ng-show=\"form.description\" ng-bind-html=\"form.description\"></small>\r\n       <div ng-if=\"isSinglefileUpload\" ng-include src=\"form.templateUrlFileUpload ? form.templateUrlFileUpload : \'singleFileUpload.html\'\"></div>\r\n       <div ng-if=\"!isSinglefileUpload\" ng-include=\"form.templateUrlFileUpload ? form.templateUrlFileUpload : \'multiFileUpload.html\'\"></div>\r\n      <div class=\"help-block mb0\" ng-show=\"uploadForm.$error.required && !uploadForm.$pristine\">{{ \'modules.attribute.fields.required.caption\' | translate }}</div>\r\n      <div class=\"help-block mb0\" ng-show=\"(hasError() && errorMessage(schemaError()))\" ng-bind-html=\"(hasError() && errorMessage(schemaError()))\"></div>\r\n   </div>\r\n</ng-form>\r\n\r\n<script type=\'text/ng-template\' id=\"uploadProcess.html\">\r\n    <div class=\"row mb\">\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ \'modules.upload.field.preview\' | translate }}\" class=\"text-info\">\r\n                {{\r\n            \'modules.upload.field.preview\' | translate\r\n                }}\r\n            </label>\r\n            <img ngf-src=\"picFile\" class=\"img-thumbnail img-responsive\">\r\n            <div class=\"img-placeholder\"\r\n                 ng-class=\"{\'show\': picFile.$invalid && !picFile.blobUrl, \'hide\': !picFile || picFile.blobUrl}\">\r\n                No preview\r\n                available\r\n            </div>\r\n        </div>\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ \'modules.upload.field.filename\' | translate }}\" class=\"text-info\">\r\n                {{\r\n            \'modules.upload.field.filename\' | translate\r\n                }}\r\n            </label>\r\n            <div class=\"filename\" title=\"{{ picFile.name }}\">{{ picFile.name }}</div>\r\n        </div>\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ \'modules.upload.field.progress\' | translate }}\" class=\"text-info\">\r\n                {{\r\n            \'modules.upload.field.progress\' | translate\r\n                }}\r\n            </label>\r\n            <div class=\"progress\">\r\n                <div class=\"progress-bar progress-bar-striped\" role=\"progressbar\"\r\n                     ng-class=\"{\'progress-bar-success\': picFile.progress == 100}\"\r\n                     ng-style=\"{width: picFile.progress + \'%\'}\">\r\n                    {{ picFile.progress }} %\r\n                </div>\r\n            </div>\r\n            <button class=\"btn btn-primary btn-sm\" type=\"button\" ng-click=\"uploadFile(picFile)\"\r\n                    ng-disabled=\"!picFile || picFile.$error\">\r\n                {{ \"buttons.upload\" | translate }}\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div ng-messages=\"uploadForm.$error\" ng-messages-multiple=\"\">\r\n        <div class=\"text-danger errorMsg\" ng-message=\"maxSize\">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong>. ({{ form.schema[picFile.$error].validationMessage2 | translate }} <strong>{{picFile.size / 1000000|number:1}}MB</strong>)</div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"pattern\">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"maxItems\">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"minItems\">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-show=\"errorMsg\">{{errorMsg}}</div>\r\n    </div>\r\n</script>\r\n\r\n<script type=\'text/ng-template\' id=\"singleFileUpload.html\">\r\n   <div ngf-drop=\"selectFile(picFile)\" ngf-select=\"selectFile(picFile)\" type=\"file\" ngf-multiple=\"false\"\r\n        ng-model=\"picFile\" name=\"file\"\r\n        ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\r\n        ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\r\n        ng-required=\"form.required\"\r\n        accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\"\r\n        ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n      <p class=\"text-center\">{{ \'modules.upload.descriptionSinglefile\' | translate }}</p>\r\n   </div>\r\n   <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n\r\n   <button ngf-select=\"selectFile(picFile)\" type=\"file\" ngf-multiple=\"false\" ng-model=\"picFile\" name=\"file\"\r\n           ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\r\n           ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\r\n           ng-required=\"form.required\"\r\n           accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\"\r\n           ng-model-options=\"form.ngModelOptions\" id=\"fileInputButton\"\r\n           class=\"btn btn-primary btn-block {{form.htmlClass}} mt-lg mb\">\r\n      <fa fw=\"fw\" name=\"upload\" class=\"mr-sm\"></fa>\r\n      {{ \"buttons.add\" | translate }}\r\n   </button>\r\n</script>\r\n\r\n<script type=\'text/ng-template\' id=\"multiFileUpload.html\">\r\n   <div ngf-drop=\"selectFiles(picFiles)\" ngf-select=\"selectFiles(picFiles)\" type=\"file\" ngf-multiple=\"true\"\r\n        ng-model=\"picFiles\" name=\"files\"\r\n        ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\r\n        ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\r\n        ng-required=\"form.required\"\r\n        accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\"\r\n        ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n      <p class=\"text-center\">{{ \'modules.upload.descriptionMultifile\' | translate }}</p>\r\n   </div>\r\n   <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n\r\n   <button ngf-select=\"selectFiles(picFiles)\" type=\"file\" ngf-multiple=\"true\" multiple ng-model=\"picFiles\" name=\"files\"\r\n           accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\"\r\n           ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\r\n           ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\r\n           ng-required=\"form.required\"\r\n           ng-model-options=\"form.ngModelOptions\" id=\"fileInputButton\"\r\n           class=\"btn btn-primary btn-block {{form.htmlClass}} mt-lg mb\">\r\n      <fa fw=\"fw\" name=\"upload\" class=\"mr-sm\"></fa>\r\n      {{ \"buttons.add\" | translate }}\r\n   </button>\r\n</script>\r\n");}]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjaGVtYS1mb3JtLWZpbGUuanMiLCJ0ZW1wbGF0ZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OEVDaFBBIiwiZmlsZSI6InNjaGVtYS1mb3JtLWZpbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG5hbmd1bGFyXHJcbiAgIC5tb2R1bGUoJ3NjaGVtYUZvcm0nKVxyXG4gICAuY29uZmlnKFsnc2NoZW1hRm9ybVByb3ZpZGVyJywgJ3NjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXInLCAnc2ZQYXRoUHJvdmlkZXInLFxyXG4gICAgICBmdW5jdGlvbiAoc2NoZW1hRm9ybVByb3ZpZGVyLCBzY2hlbWFGb3JtRGVjb3JhdG9yc1Byb3ZpZGVyLCBzZlBhdGhQcm92aWRlcikge1xyXG4gICAgICAgICB2YXIgZGVmYXVsdFBhdHRlcm5Nc2cgID0gJ1dyb25nIGZpbGUgdHlwZS4gQWxsb3dlZCB0eXBlcyBhcmUgJyxcclxuICAgICAgICAgICAgIGRlZmF1bHRNYXhTaXplTXNnMSA9ICdUaGlzIGZpbGUgaXMgdG9vIGxhcmdlLiBNYXhpbXVtIHNpemUgYWxsb3dlZCBpcyAnLFxyXG4gICAgICAgICAgICAgZGVmYXVsdE1heFNpemVNc2cyID0gJ0N1cnJlbnQgZmlsZSBzaXplOicsXHJcbiAgICAgICAgICAgICBkZWZhdWx0TWluSXRlbXNNc2cgPSAnWW91IGhhdmUgdG8gdXBsb2FkIGF0IGxlYXN0IG9uZSBmaWxlJyxcclxuICAgICAgICAgICAgIGRlZmF1bHRNYXhJdGVtc01zZyA9ICdZb3UgY2FuXFwndCB1cGxvYWQgbW9yZSB0aGFuIG9uZSBmaWxlLicsXHJcbiAgICAgICAgICAgIGRlZmF1bHRDaHVua2VkRmlsZVNpemUgPSAxMDAwMDtcclxuXHJcbiAgICAgICAgICAgIHZhciBud3BTaW5nbGVmaWxlVXBsb2FkID0gZnVuY3Rpb24gKG5hbWUsIHNjaGVtYSwgb3B0aW9ucykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNjaGVtYS50eXBlID09PSAnYXJyYXknICYmIHNjaGVtYS5mb3JtYXQgPT09ICdzaW5nbGVmaWxlJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEucGF0dGVybiAmJiBzY2hlbWEucGF0dGVybi5taW1lVHlwZSAmJiAhc2NoZW1hLnBhdHRlcm4udmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLnBhdHRlcm4udmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0UGF0dGVybk1zZztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5tYXhTaXplICYmIHNjaGVtYS5tYXhTaXplLm1heGltdW0gJiYgIXNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1heFNpemVNc2cxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWF4U2l6ZS52YWxpZGF0aW9uTWVzc2FnZTIgPSBkZWZhdWx0TWF4U2l6ZU1zZzI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWluSXRlbXMgJiYgc2NoZW1hLm1pbkl0ZW1zLm1pbmltdW0gJiYgIXNjaGVtYS5taW5JdGVtcy52YWxpZGF0aW9uTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWluSXRlbXMudmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0TWluSXRlbXNNc2c7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWF4SXRlbXMgJiYgc2NoZW1hLm1heEl0ZW1zLm1heGltdW0gJiYgIXNjaGVtYS5tYXhJdGVtcy52YWxpZGF0aW9uTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWF4SXRlbXMudmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0TWF4SXRlbXNNc2c7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKHNjaGVtYS5jaHVua2VkRmlsZVNpemUpIHx8IHNjaGVtYS5jaHVua2VkRmlsZVNpemUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2hlbWEuY2h1bmtlZEZpbGVTaXplID0gZGVmYXVsdENodW5rZWRGaWxlU2l6ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmID0gc2NoZW1hRm9ybVByb3ZpZGVyLnN0ZEZvcm1PYmoobmFtZSwgc2NoZW1hLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgICAgICAgICBmLmtleSA9IG9wdGlvbnMucGF0aDtcclxuICAgICAgICAgICAgICAgICAgICBmLnR5cGUgPSAnbndwRmlsZVVwbG9hZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5sb29rdXBbc2ZQYXRoUHJvdmlkZXIuc3RyaW5naWZ5KG9wdGlvbnMucGF0aCldID0gZjtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgIHNjaGVtYUZvcm1Qcm92aWRlci5kZWZhdWx0cy5hcnJheS51bnNoaWZ0KG53cFNpbmdsZWZpbGVVcGxvYWQpO1xyXG5cclxuICAgICAgICAgdmFyIG53cE11bHRpZmlsZVVwbG9hZCA9IGZ1bmN0aW9uIChuYW1lLCBzY2hlbWEsIG9wdGlvbnMpIHtcclxuICAgICAgICAgICAgIGlmIChzY2hlbWEudHlwZSA9PT0gJ2FycmF5JyAmJiBzY2hlbWEuZm9ybWF0ID09PSAnbXVsdGlmaWxlJykge1xyXG4gICAgICAgICAgICAgICAgIGlmIChzY2hlbWEucGF0dGVybiAmJiBzY2hlbWEucGF0dGVybi5taW1lVHlwZSAmJiAhc2NoZW1hLnBhdHRlcm4udmFsaWRhdGlvbk1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLnBhdHRlcm4udmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0UGF0dGVybk1zZztcclxuICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5tYXhTaXplICYmIHNjaGVtYS5tYXhTaXplLm1heGltdW0gJiYgIXNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1heFNpemVNc2cxO1xyXG4gICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWF4U2l6ZS52YWxpZGF0aW9uTWVzc2FnZTIgPSBkZWZhdWx0TWF4U2l6ZU1zZzI7XHJcbiAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWluSXRlbXMgJiYgc2NoZW1hLm1pbkl0ZW1zLm1pbmltdW0gJiYgIXNjaGVtYS5taW5JdGVtcy52YWxpZGF0aW9uTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWluSXRlbXMudmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0TWluSXRlbXNNc2c7XHJcbiAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWF4SXRlbXMgJiYgc2NoZW1hLm1heEl0ZW1zLm1heGltdW0gJiYgIXNjaGVtYS5tYXhJdGVtcy52YWxpZGF0aW9uTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICBzY2hlbWEubWF4SXRlbXMudmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0TWF4SXRlbXNNc2c7XHJcbiAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKHNjaGVtYS5jaHVua2VkRmlsZVNpemUpIHx8IHNjaGVtYS5jaHVua2VkRmlsZVNpemUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICBzY2hlbWEuY2h1bmtlZEZpbGVTaXplID0gZGVmYXVsdENodW5rZWRGaWxlU2l6ZTtcclxuICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgIHZhciBmID0gc2NoZW1hRm9ybVByb3ZpZGVyLnN0ZEZvcm1PYmoobmFtZSwgc2NoZW1hLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgICAgICBmLmtleSA9IG9wdGlvbnMucGF0aDtcclxuICAgICAgICAgICAgICAgICBmLnR5cGUgPSAnbndwRmlsZVVwbG9hZCc7XHJcbiAgICAgICAgICAgICAgICAgb3B0aW9ucy5sb29rdXBbc2ZQYXRoUHJvdmlkZXIuc3RyaW5naWZ5KG9wdGlvbnMucGF0aCldID0gZjtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZjtcclxuICAgICAgICAgICAgIH1cclxuICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgIHNjaGVtYUZvcm1Qcm92aWRlci5kZWZhdWx0cy5hcnJheS51bnNoaWZ0KG53cE11bHRpZmlsZVVwbG9hZCk7XHJcblxyXG4gICAgICAgICBzY2hlbWFGb3JtRGVjb3JhdG9yc1Byb3ZpZGVyLmFkZE1hcHBpbmcoXHJcbiAgICAgICAgICAgICdib290c3RyYXBEZWNvcmF0b3InLFxyXG4gICAgICAgICAgICAnbndwRmlsZVVwbG9hZCcsXHJcbiAgICAgICAgICAgICdkaXJlY3RpdmVzL2RlY29yYXRvcnMvYm9vdHN0cmFwL253cC1maWxlL253cC1maWxlLmh0bWwnXHJcbiAgICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgXSk7XHJcblxyXG5hbmd1bGFyXHJcbiAgIC5tb2R1bGUoJ25nU2NoZW1hRm9ybUZpbGUnLCBbXHJcbiAgICAgICduZ0ZpbGVVcGxvYWQnLFxyXG4gICAgICAnbmdNZXNzYWdlcycsXHJcbiAgICAgICdTU0FUQi5Mb2NhbEZvcmFnZSdcclxuICAgXSlcclxuICAgLmRpcmVjdGl2ZSgnbmdTY2hlbWFGaWxlJywgWydVcGxvYWQnLCAnJHRpbWVvdXQnLCAnJHEnLCAnJGxvY2FsRm9yYWdlJywnc3NhdGJIdHRwJywgZnVuY3Rpb24gKFVwbG9hZCwgJHRpbWVvdXQsICRxLCAkbG9jYWxGb3JhZ2Usc3NhdGJIdHRwKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgIHNjb3BlOiAgICB0cnVlLFxyXG4gICAgICAgICByZXF1aXJlOiAgJ25nTW9kZWwnLFxyXG4gICAgICAgICBsaW5rOiAgICAgZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbCkge1xyXG4gICAgICAgICAgICAgc2NvcGUuc3RvcmFnZURvbWFpbiA9IHNjb3BlLmZvcm0gJiYgc2NvcGUuZm9ybS5zdG9yYWdlRG9tYWluO1xyXG4gICAgICAgICAgICAgc2NvcGUubWV0YURhdGEgPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0ubWV0YURhdGE7XHJcbiAgICAgICAgICAgICBzY29wZS51cGxvYWRlZEZpbGVzID0gW107XHJcbiAgICAgICAgICAgICBzY29wZS5hcGlJbmZvID0gZ2V0QXBpQ29uZmlnRnJvbUFwaUluZm8oJGxvY2FsRm9yYWdlLl9sb2NhbGZvcmFnZS5fY29uZmlnLmFwaUluZm8pO1xyXG4gICAgICAgICAgICBzY29wZS5pc1NpbmdsZWZpbGVVcGxvYWQgPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0uc2NoZW1hICYmIHNjb3BlLmZvcm0uc2NoZW1hLmZvcm1hdCA9PT0gJ3NpbmdsZWZpbGUnO1xyXG4gICAgICAgICAgICBzY29wZS51cGxvYWRPbkZpbGVTZWxlY3QgPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0udXBsb2FkT25GaWxlU2VsZWN0O1xyXG4gICAgICAgICAgICBzY29wZS5maWxlVXBsb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIG5nTW9kZWwuJHJlbmRlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChuZ01vZGVsLiRtb2RlbFZhbHVlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2gobmdNb2RlbC4kbW9kZWxWYWx1ZSwgZnVuY3Rpb24gKGYsIGtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRGaWxlVG9GaWxlSW5mbyhmKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBzY29wZS5zZWxlY3RGaWxlICA9IGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgIHNjb3BlLnBpY0ZpbGUgPSBmaWxlO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBzY29wZS5zZWxlY3RGaWxlcyA9IGZ1bmN0aW9uIChmaWxlcykge1xyXG4gICAgICAgICAgICAgICBzY29wZS5waWNGaWxlcyA9IGZpbGVzO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZSA9IGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgIGZpbGUgJiYgZG9VcGxvYWQoZmlsZSk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlcyA9IGZ1bmN0aW9uIChmaWxlcykge1xyXG4gICAgICAgICAgICAgICBmaWxlcy5sZW5ndGggJiYgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCBmdW5jdGlvbiAoZmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICBkb1VwbG9hZChmaWxlKTtcclxuICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZUZpbGUgPSBmdW5jdGlvbiAoZmlsZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGFwaUluZm8gPSBzY29wZS5hcGlJbmZvO1xyXG4gICAgICAgICAgICAgICAgdmFyIHVybCA9IGFwaUluZm8uVXJsICsgXCIvYXBpL3YxL3N0b3JhZ2VEb21haW5zL1wiICsgc2NvcGUuc3RvcmFnZURvbWFpbiArIFwiL2ZpbGVzL1wiICsgZmlsZS5maWxlSWQ7XHJcbiAgICAgICAgICAgICAgICBzc2F0Ykh0dHAuZGVsZXRlKHVybCkudGhlbihmdW5jdGlvbiAoKSB7IHZhciBpbmRleCA9IHNjb3BlLnVwbG9hZGVkRmlsZXMuaW5kZXhPZihmaWxlKTsgc2NvcGUudXBsb2FkZWRGaWxlcy5zcGxpY2UoaW5kZXgsIDEpOyB9KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGdldEFwaUNvbmZpZ0Zyb21BcGlJbmZvKGFwaUluZm9PYmplY3QpIHtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGFwaUluZm8gaW4gYXBpSW5mb09iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzZXJ2aWNlTmFtZSA9IGFwaUluZm9PYmplY3RbYXBpSW5mb10uU2VydmljZU5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlcnZpY2VOYW1lICE9IG51bGwgJiYgc2VydmljZU5hbWUudG9Mb3dlckNhc2UoKS50cmltKCkgPT0gXCJzc2F0Yi5maWxlc2VydmljZVwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXBpSW5mb09iamVjdFthcGlJbmZvXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGdldEZpbGVJbmZvKGZpbGVJZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGFwaUluZm8gPSBzY29wZS5hcGlJbmZvO1xyXG4gICAgICAgICAgICAgICAgdmFyIHVybCA9IGFwaUluZm8uVXJsICsgXCIvYXBpL3YxL3N0b3JhZ2VEb21haW5zL1wiICsgc2NvcGUuc3RvcmFnZURvbWFpbiArIFwiL2ZpbGVzL1wiICsgZmlsZUlkO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNzYXRiSHR0cC5nZXQodXJsKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkgeyByZXR1cm4gcmVzcG9uc2U7IH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGFkZEZpbGVUb0ZpbGVJbmZvKGZpbGVJZClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldEZpbGVJbmZvKGZpbGVJZCkudGhlbihmdW5jdGlvbiAoZikge1xyXG4gICAgICAgICAgICAgICAgICAgIGYubmFtZSA9IGYucHJvcGVydGllcy5jb250ZW50RGlzcG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGYubmFtZS5pbmRleE9mKFwiZmlsZW5hbWU9XCIpID09IDApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGYubmFtZSA9IGYubmFtZS5zdWJzdHJpbmcoOSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkZWRGaWxlcy5wdXNoKGYpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZnVuY3Rpb24gZG9VcGxvYWQoZmlsZSkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuc2VsZWN0RmlsZShmaWxlKTtcclxuICAgICAgICAgICAgICAgIHZhciBhcGlJbmZvID0gc2NvcGUuYXBpSW5mbztcclxuICAgICAgICAgICAgICAgIGlmIChmaWxlICYmICFmaWxlLiRlcnJvciAmJiBhcGlJbmZvICYmIHNjb3BlLnN0b3JhZ2VEb21haW4pIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdXJsID0gYXBpSW5mby5VcmwgKyBcIi9hcGkvdjEvc3RvcmFnZURvbWFpbnMvXCIgKyBzY29wZS5zdG9yYWdlRG9tYWluICsgXCIvZmlsZXNcIjtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHsgZmlsZTogZmlsZSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzY29wZS5tZXRhRGF0YSAhPSBudWxsKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gc2NvcGUubWV0YURhdGEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhWyd4LWZpbGUtbWV0YWRhdGEtJyArIGtleV0gPSBzY29wZS5tZXRhRGF0YVtrZXldO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGxvYWRDb25maWcgPVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiBhcGlJbmZvLkhlYWRlcnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZS5zaXplID4gc2NvcGUuZm9ybS5zY2hlbWEuY2h1bmtlZEZpbGVTaXplKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSW5pdGlhdGUgdGhlIGZpbGUgVXBsb2FkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjaHVua1VybCA9IGFwaUluZm8uVXJsICsgXCIvYXBpL3YxL3N0b3JhZ2VEb21haW5zL1wiICsgc2NvcGUuc3RvcmFnZURvbWFpbiArIFwiL2NodW5rZWQvZmlsZXNcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzc2F0Ykh0dHAucG9zdChjaHVua1VybCwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogZmlsZS50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb250ZW50LURpc3Bvc2l0aW9uXCI6ICdmaWxlbmFtZT1cIicgKyBmaWxlLm5hbWUgKyAnXCInXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmlsZUlkID0gcmVzcG9uc2UucmVzcG9uc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRDb25maWcucmVzdW1lU2l6ZVVybCA9IGNodW5rVXJsICsgXCIvXCIgKyBmaWxlSWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRDb25maWcudXJsID0gY2h1bmtVcmwgKyBcIi9cIiArIGZpbGVJZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZENvbmZpZy5yZXN1bWVDaHVua1NpemUgPSBzY29wZS5mb3JtLnNjaGVtYS5jaHVua2VkRmlsZVNpemUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRDb25maWcucmVzdW1lU2l6ZVJlc3BvbnNlUmVhZGVyID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5wcm9wZXJ0aWVzLmNvbnRlbnRMZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2lja09mZkZpbGVVcGxvYWQoZmlsZSwgdXBsb2FkQ29uZmlnLCBmaWxlSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS51cGxvYWQucHJvZ3Jlc3MoZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUucHJvZ3Jlc3MgPSBNYXRoLm1pbigxMDAsIHBhcnNlSW50KDEwMC4wICpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBraWNrT2ZmRmlsZVVwbG9hZChmaWxlLCB1cGxvYWRDb25maWcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnVwbG9hZC5wcm9ncmVzcyhmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnByb2dyZXNzID0gTWF0aC5taW4oMTAwLCBwYXJzZUludCgxMDAuMCAqXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmdW5jdGlvbiBraWNrT2ZmRmlsZVVwbG9hZChmaWxlLCB1cGxvYWRDb25maWcsIGZpbGVJZCkge1xyXG4gICAgICAgICAgICAgICAgZmlsZS51cGxvYWQgPSBVcGxvYWQudXBsb2FkKHVwbG9hZENvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5maWxlVXBsb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGZpbGUudXBsb2FkLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnJlc3VsdCA9IHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gbmdNb2RlbC4kbW9kZWxWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXIuaXNEZWZpbmVkKG5ld1ZhbHVlKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChmaWxlSWQpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlSWQgPSByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld1ZhbHVlLnB1c2goZmlsZUlkKTtcclxuICAgICAgICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUobmV3VmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGFkZEZpbGVUb0ZpbGVJbmZvKGZpbGVJZCkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmZpbGVVcGxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZXJyb3JNc2cgPSByZXNwb25zZS5zdGF0dXMgKyAnOiAnICsgcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc2NvcGUudmFsaWRhdGVGaWVsZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZSAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGUuJHZhbGlkICYmIHNjb3BlLnBpY0ZpbGUgJiYgIXNjb3BlLnBpY0ZpbGUuJGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGVmaWxlLWZvcm0gaXMgaW52YWxpZCcpO1xyXG4gICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlcy4kdmFsaWQgJiYgc2NvcGUucGljRmlsZXMgJiYgIXNjb3BlLnBpY0ZpbGVzLiRlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbXVsdGlmaWxlLWZvcm0gaXMgIGludmFsaWQnKTtcclxuICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZS0gYW5kIG11bHRpZmlsZS1mb3JtIGFyZSB2YWxpZCcpO1xyXG4gICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHNjb3BlLnN1Ym1pdCAgICAgICAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgIGlmIChzY29wZS51cGxvYWRGb3JtLmZpbGUgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlICYmICFzY29wZS5waWNGaWxlLiRlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlKHNjb3BlLnBpY0ZpbGUpO1xyXG4gICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlcy4kdmFsaWQgJiYgc2NvcGUucGljRmlsZXMgJiYgIXNjb3BlLnBpY0ZpbGVzLiRlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlcyhzY29wZS5waWNGaWxlcyk7XHJcbiAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgc2NvcGUuJG9uKCdzY2hlbWFGb3JtVmFsaWRhdGUnLCBzY29wZS52YWxpZGF0ZUZpZWxkKTtcclxuICAgICAgICAgICAgc2NvcGUuJG9uKCdzY2hlbWFGb3JtRmlsZVVwbG9hZFN1Ym1pdCcsIHNjb3BlLnN1Ym1pdCk7XHJcbiAgICAgICAgIH1cclxuICAgICAgfTtcclxuICAgfV0pO1xyXG4iLG51bGxdfQ==
