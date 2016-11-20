/*
 * ----------------------------------------
 *
 * Based on https://github.com/mozilla/localForage/blob/master/src/drivers/websql.js
 *
 */
var localforageSsatbDriver = {
    DRIVER_NAME : 'localForage-SsatbDriver'
};
(function () {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
        require('promise') : this.Promise;

    var globalObject = this;
    var serializer = null;


    var ModuleType = {
        DEFINE: 1,
        EXPORT: 2,
        WINDOW: 3
    };

    // Attaching to window (i.e. no module loader) is the assumed,
    // simple default.
    var moduleType = ModuleType.WINDOW;

    // Find out what kind of module setup we have; if none, we'll just attach
    // localForage to the main window.
    if (typeof module !== 'undefined' && module.exports) {
        moduleType = ModuleType.EXPORT;
    } else if (typeof define === 'function' && define.amd) {
        moduleType = ModuleType.DEFINE;
    }

    function _initStorage(options) {
        var self = this;
        var apiInfo = null;
        if (options) {
            self._apiInfo = options.apiInfo;
        }
        return Promise.resolve();
    }

    function appendServiceResponseHeaders(obj, jqXHR) {
        var headers = null;
        if (obj != null)
            if (jqXHR != null) {
                var headersStr = jqXHR.getAllResponseHeaders();
                var headersArray = headersStr.split("\n");
                var headers = {};
                for (var i in headersArray) {
                    var header = headersArray[i];
                    var kvs = header.split(":");
                    var key = kvs[0];
                    if (key) {
                        key = key.trim();
                        if (key.length != 0) {
                            var val = kvs[1];
                            if (val)
                                val = val.trim();
                            headers[key] = val;
                        }
                    }
                }
            }
            else
                console.warn("jqXHR is null. Headers not populated");
        if (headers != null)
            obj.responseHeaders = headers;
        return obj;
    }

    function iterate(iterator, callback) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self.ready().then(function () {
                var apiInfo = getDefaultApiDetails(self._apiInfo);

                $.ajax({
                    method: apiInfo.iterate.verb ? apiInfo.iterate.verb : "GET",
                    url: apiInfo.Url + apiInfo.iterate.url,
                    headers: apiInfo.Headers,
                    global: false,
                    cache: false,
                    dataType: "json",
                    contentType: 'application/json; charset=utf-8',
                }).done(function (items) {
                    var length = items.length;
                    for (var i = 0; i < length; i++) {
                        var item = items[i];
                        item = iterator(item, item[apiInfo.iterate.keyProperty],
                                   i + 1);
                        if (item !== void (0)) {
                            resolve(item);
                            return;
                        }
                    }
                    resolve();
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    reject(getServerError(apiInfo, jqXHR, textStatus, errorThrown));
                });

            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function getItem(key, callback) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self.ready().then(function () {
                var apiDetails = getApiDetails(key);
                var apiInfo = self._apiInfo[apiDetails.serviceName];

                $.ajax({
                    method: apiDetails.verb,
                    url: apiInfo.Url + apiDetails.url,
                    dataType: "json",
                    global: false,
                    cache: false,
                    contentType: 'application/json; charset=utf-8',
                    headers: apiInfo.Headers
                }).done(function (obj, responseStatus, jqXHR) {
                    resolve(appendServiceResponseHeaders(obj, jqXHR));
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    reject(getServerError(apiDetails,jqXHR, textStatus, errorThrown));
                });

            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }
    function setItem(key, value, callback) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self.ready().then(function () {
                var apiDetails = getApiDetails(key);
                var apiInfo = self._apiInfo[apiDetails.serviceName];

                $.ajax({
                    method: apiDetails.verb,
                    url: apiInfo.Url + apiDetails.url,
                    dataType: "json",
                    global: false,
                    cache: false,
                    contentType: 'application/json; charset=utf-8',
                    headers: apiInfo.Headers,
                    data: JSON.stringify(value)
                }).done(function (response, responseStatus, jqXHR) {
                    value.response = response;
                    resolve(appendServiceResponseHeaders(value, jqXHR));
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    reject(getServerError(apiDetails, jqXHR, textStatus, errorThrown));
                });

            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                ' used as a key, but it is not a string.');
            key = String(key);
        }
        var promise = new Promise(function (resolve, reject) {
            self.ready().then(function () {
                var apiDetails = getApiDetails(key);
                var apiInfo = self._apiInfo[apiDetails.serviceName];
                $.ajax({
                    method: apiDetails.verb,
                    url: apiInfo.Url + apiDetails.url,
                    global: false,
                    cache: false,
                    headers: apiInfo.Headers
                }).done(function () {
                    resolve()
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    reject(getServerError(apiDetails, jqXHR, textStatus, errorThrown));
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function clear(callback) {
        var self = this;

        var promise = new Promise(function (resolve, reject) {
            self.ready().then(function () {
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function length(callback) {
        var self = this;

        var promise = new Promise(function (resolve, reject) {
            self.ready().then(function () {
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function key(n, callback) {
        var self = this;

        var promise = new Promise(function (resolve, reject) {
            self.ready().then(function () {
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;

        var promise = new Promise(function (resolve, reject) {
            self.ready().then(function () {
            }).catch(reject);
        });
        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function (result) {
                callback(null, result);
            }, function (error) {
                callback(error);
            });
        }
    }

    function getApiDetails(key) {
        var api = key.split("|");
        return {
            serviceName: api[0],
            verb: api[1],
            url: api[2]
        };
    }
    function getDefaultApiDetails(apiHashmap) {
        var defaultKey = null;
        for (var firstKey in apiHashmap) {
            defaultKey = firstKey;
            break;
        }
        if (defaultKey == null)
            return null;
        return apiHashmap[defaultKey];
    }

    function getServerError(apiDetails, jqXHR, textStatus, errorThrown) {
        return {
            serviceName: apiDetails.serviceName,
            method: apiDetails.verb,
            status: jqXHR.status,
            url: apiDetails.url,
            statusText: textStatus,
            errorThrown: errorThrown,
            data: jqXHR.responseJSON
        };
    }


    var driver = {
        _driver: localforageSsatbDriver.DRIVER_NAME,
        _initStorage: _initStorage,
        _support: true,
        iterate: iterate,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };
    if (moduleType === ModuleType.DEFINE) {
        define(localforageSsatbDriver.DRIVER_NAME, function () {
            return driver;
        });
    } else if (moduleType === ModuleType.EXPORT) {
        module.exports = driver;
    } else {
        this[localforageSsatbDriver.DRIVER_NAME] = driver;
    }

    localforage.defineDriver(driver);

}).call(window);

angular.module('SSATB.LocalForage', ['LocalForageModule'])
.provider('ssatbHttp', ['$localForageProvider', function ($localForageProvider) {

    var _config = {
        driver: [localforageSsatbDriver.DRIVER_NAME]
    };

    this.config = function (config) {
        if (!angular.isObject(config))
            throw new Error('The config parameter should be an object');

        _config = angular.extend(_config, config);
        $localForageProvider.config(_config);
    };

    var interceptorFactories = this.interceptors = [];

    function getApiNameByUrl(url) {

        if (!angular.isObject(_config.apiInfo))
            return null;

        var service = null;
        angular.forEach(_config.apiInfo, function (value, key) {
            if (url.toLowerCase().indexOf(value.Url.toLowerCase()) === 0) {
                service = key;
            }
        });
        return service;
    }

    this.$get = ['$localForage', '$q', '$injector', function ($localForage, $q, $injector) {

        var reversedInterceptors = [];
        angular.forEach(interceptorFactories, function (interceptorFactory) {
            reversedInterceptors.unshift(angular.isString(interceptorFactory)
                ? $injector.get(interceptorFactory) : $injector.invoke(interceptorFactory));
        });

        function ssatbHttp(requestConfig) {

            if (!angular.isObject(requestConfig))
                throw new Error('Http request configuration must be an object.');
            if (!angular.isString(requestConfig.url))
                throw new Error('Http request configuration url must be a string.');

            var config = angular.extend({
                method: 'get'
            }, requestConfig);

            config.method = angular.uppercase(config.method);

            var service = getApiNameByUrl(requestConfig.url);
            if (service === null)
                throw new Error('No matching apiInfo was found in the provider configuration for the service URL ' + requestConfig.url);

            var requestInterceptors = [];
            var responseInterceptors = [];
            var promise = $q.when(config);

            // apply interceptors
            angular.forEach(reversedInterceptors, function (interceptor) {
                if (interceptor.request || interceptor.requestError) {
                    requestInterceptors.unshift(interceptor.request, interceptor.requestError);
                }
                if (interceptor.response || interceptor.responseError) {
                    responseInterceptors.push(interceptor.response, interceptor.responseError);
                }
            });

            promise = chainInterceptors(promise, requestInterceptors);
            promise = promise.then(function (result) {
                var apiInfo = _config.apiInfo[service];
                var key = service + '|' + config.method + '|' + requestConfig.url.substring(apiInfo.Url.length);
                if (config.method === 'GET')
                    return $localForage.getItem(key);
                else
                    if (config.method === 'DELETE')
                        return $localForage.removeItem(key);
                    else
                        return $localForage.setItem(key, requestConfig.data);

            });
            promise = promise.then(function (response) {
                if (response != null)
                    response.config = config;
                else
                    return { config: config };
                return response;

            }, function (response) {
                if (response != null) {
                    response.config = config
                    throw response
                }
                else {
                    throw new { config: config };
                }
            });

            return chainInterceptors(promise, responseInterceptors);
        }

        createShortMethods('get', 'delete');
        createShortMethodsWithData('post', 'put');

        return ssatbHttp;

        function createShortMethods(names) {
            angular.forEach(arguments, function (name) {
                ssatbHttp[name] = function (url, config) {
                    return ssatbHttp(angular.extend({}, config || {}, {
                        method: name,
                        url: url
                    }));
                };
            });
        }

        function createShortMethodsWithData(name) {
            angular.forEach(arguments, function (name) {
                ssatbHttp[name] = function (url, data, config) {
                    return ssatbHttp(angular.extend({}, config || {}, {
                        method: name,
                        url: url,
                        data: data
                    }));
                };
            });
        }
        function chainInterceptors(promise, interceptors) {
            for (var i = 0, ii = interceptors.length; i < ii;) {
                var thenFn = interceptors[i++];
                var rejectFn = interceptors[i++];
                promise = promise.then(thenFn, rejectFn);
            }
            interceptors.length = 0;
            return promise;
        }

    }];

}]);
(function () {
    var authTokenRefreshService = (
    function authTokenRefreshService($window, $http) {
        this.$window = $window;
        this.$http = $http;
        return {
            refreshToken: refreshToken
        }
        function refreshToken(refreshTokenBaseUrl,serviceName) {
            var refreshTokenUrl = refreshTokenBaseUrl + '?serviceName=' + serviceName;

            return $http.get(refreshTokenUrl).then(refreshTokenComplete);

            function refreshTokenComplete(response) {
                return response;
            }
        }
    }
);

    var messageInterceptorsConfig = function ($provide, provider) {
        // push function to the interceptors which will intercept all the http responses
        provider.interceptors.push(['$q', '$injector', '$localForage', function ($q, $injector, $localForage) {
            return {
                responseError: function (errorResponse) {
                    var deferred = $q.defer();
                    var apiInfoObject = $localForage._localforage._apiInfo;
                    var serviceName = getServiceNameFromApiInfo(apiInfoObject, errorResponse);
                    var config = $injector.get('ssatbAuthTokenRefreshConfig');
                    if (serviceName != null && config.refreshTokenUrl != null && !angular.isUndefined(errorResponse.config) && errorResponse.config != null
                                && (angular.isUndefined(errorResponse.config.retry) || errorResponse.config.retry == false)
                                    && errorResponse.status === 401) {
                        $injector.get('authTokenRefreshService').refreshToken(config.refreshTokenUrl, serviceName).then(function (response) {
                            var apiInfo = apiInfoObject[errorResponse.serviceName];
                            apiInfo.Headers = response.data;
                            _retrySsatbHttpRequest(errorResponse.config, deferred, $injector);
                        }, function () {
                            if (!angular.isUndefined(errorResponse.errorHandler) && config.errorHandler != null)
                                config.errorHandler('An unexpected error occurred.  For assistance, please email info@enrollment.org.');
                            deferred.reject(errorResponse);
                        });
                    } else {
                        if (!angular.isUndefined(errorResponse.errorHandler) && config.errorHandler != null)
                            config.errorHandler('An unexpected error occurred.  For assistance, please email info@enrollment.org.');
                        deferred.reject(errorResponse);
                    }
                    return deferred.promise;

                    function getServiceNameFromApiInfo(apiInfoObject, errorResponse)
                    {
                        if (errorResponse.serviceName == null)
                            return null;
                        var apiInfo = apiInfoObject[errorResponse.serviceName];
                        if (apiInfo == null)
                            return null;
                        return apiInfo.ServiceName;
                    }
                }
            };
        }
        ])
    };
    var _retrySsatbHttpRequest = function (config, deferred, $injector) {
        $ssatbHttp = $injector.get('ssatbHttp');
        config.retry = true;
        $ssatbHttp(config).then(function (response) {
            deferred.resolve(response);
        }, function (response) {
            alertDialog('An unexpected error occurred.  For assistance, please email info@enrollment.org.');
            deferred.reject(response);
        });
    }
    angular.module('ssatb.authtokenrefresh', ['SSATB.LocalForage'])
        .provider('ssatbAuthTokenRefreshConfig', ['ssatbHttpProvider', function (ssatbHttpProvider) {
            var _config = {};
            this.config = function (config)
            {
                if (!angular.isObject(config))
                    throw new Error('The config parameter should be an object');
                _config = config;
            }
            this.$get = function () {
                return _config;
            }
            }])
        .config(['$provide', 'ssatbHttpProvider', messageInterceptorsConfig])
      .service('authTokenRefreshService', ['$window', '$http', authTokenRefreshService]);
})();
