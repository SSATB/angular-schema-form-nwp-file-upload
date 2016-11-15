'use strict';

angular.module("ssatb.services", [])
        .provider("apiInfo", function apiInfoProvider() {
            this.$get = function apiInfoProviderFactory() {
                return { "fileService": { "Headers": { "Authorization": "Basic c3NhdGI6cGVuY2lsczE0IQ==" }, "Url": "https://localhost:44313", "ServiceName": "SSATB.FileService" } };
            };
        })
;


var myApp = angular.module('formApp', [
   'schemaForm',
   'pascalprecht.translate',
   'ngSchemaFormFile',
   'ssatb.services'
])
.controller('formController', ['$scope', '$q', function ($scope, $q) {
  
  $scope.schema = {
    "type": "object",
    "title": "Album",
    "properties": {
      "image": {
        "title": "Image",
        "type": "array",
        "format": "singlefile",
        "x-schema-form": {
          "type": "array"
        },
        "pattern": {
          "mimeType": "image/*",
          "validationMessage": "Wrong File Type: "
        },
        "maxSize": {
          "maximum": "2MB",
          "validationMessage": "Allowed file size exceeded: ",
          "validationMessage2": "Current File size: "
        },
        "maxItems": {
          "validationMessage": "More files have been uploaded than allowed."
        },
        "minItems": {
          "validationMessage": "You must upload at least one file"
        }
      },
      "images": {
        "title": "Images",
        "type": "array",
        "format": "multifile",
        "x-schema-form": {
          "type": "array"
        },
        "pattern": {
          "mimeType": "image/*,!.gif",
          "validationMessage": "Wrong File Type: "
        },
        "maxSize": {
          "maximum": "2MB",
          "validationMessage": "Allowed file size exceeded: ",
          "validationMessage2": "Current File size: "
        },
        "maxItems": {
          "validationMessage": "More files have been uploaded than allowed."
        },
        "minItems": {
          "validationMessage": "You must upload at least one file"
        }
      }
    },
    "required": [
      "images"
    ]
  };

  $scope.form = [
  {
    "key": "image",
    "type": "nwpFileUpload",
    "storageDomain": "profileattachments"

  }, {
    "key": "images",
    "type": "nwpFileUpload",
    "storageDomain": "profileattachments"
  }];
  
  $scope.model = {};

   $scope.submit = function () {
      $scope.$broadcast('schemaFormValidate');
      if ($scope.myForm.$valid) {
         console.log('form valid');
      }
   };

}])
.config(['$translateProvider', '$localForageProvider', 'apiInfoProvider', 'ssatbHttpProvider', function ($translateProvider, $localForageProvider, apiInfoProvider, ssatbHttpProvider) {
    // Simply register translation table as object hash
    $translateProvider.translations('en', {
        'modules.upload.dndNotSupported': 'Drag n drop not surpported by your browser',
        'modules.attribute.fields.required.caption': 'Required',
        'modules.upload.descriptionMultifile': 'Drop your file(s) here',
        'buttons.add': 'Open file browser',
        'modules.upload.field.filename': 'Filename',
        'modules.upload.field.preview': 'Preview',
        'modules.upload.multiFileUpload': 'Multifile upload',
        'modules.upload.field.progress': 'Progress',
        'buttons.upload': 'Upload'
    });
    $translateProvider.preferredLanguage('en');
    var apiInfo = apiInfoProvider.$get();
    ssatbHttpProvider.config({
        name: 'ssatb',
        version: 1.0,
        storeName: 'fileServices',
        description: 'File Service',
        apiInfo: apiInfo
    });
}]);

