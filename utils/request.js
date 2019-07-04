'use strict';

const DEFAULT_HEADER = {
    'content-type': 'application/json'
}

/**
 * Create a new instance of InterceptorManager
 */
function InterceptorManager() {
    this.handlers = []
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function (fulfilled, rejected) {
    this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
    })
    return this.handlers.length - 1
}


/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.reject = function (id) {
    this.handlers[id] = null
}

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function (fn) {
    this.handlers.forEach(function forEachHandler(h) {
        if (h !== null) {
            fn(h)
        }
    })
}

/** Dispatch a request to server using wx.request()
* 
* var reqTask = wx.request({
*     url: '',
*     data: {},
*     header: { 'content-type': 'application/json' },
*     method: 'GET',
*     dataType: 'json',
*     responseType: 'text',
*     success: (result) => {
*           result: {
*           data	            string/Object/Arraybuffer	开发者服务器返回的数据
*           statusCode	        number	                    开发者服务器返回的 HTTP 状态码
*           header	            Object	                    开发者服务器返回的 HTTP Response Header
*           }
*     },
*     fail: () => { },
*     complete: () => { }
* });
*/
function dispatchRequest(config) {
    return new Promise((resolve, reject) => {
        wx.request({
            ...config,
            success: resolve,
            fail: reject
        })
    })
}

/**
 * Create a new instance of Request
 * 
 * @param {Object} instanceConfig the default config for the instance
 */
function Request(instanceConfig) {
    this.defaults = instanceConfig;
    this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager()
    };
}

/**
 * Dispatch a request
 * 
 * @param {Object} config the config specific for this request
 */
Request.prototype.request = function (config) {
    var chain = [dispatchRequest, undefined];
    var promise = Promise.resolve(config);

    this.interceptors.request.forEach(function (interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
    })

    this.interceptors.response.forEach(function (interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
    })

    while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
}

/**
 * 创建 `Request` 实例 Create an instance of Request
 * 
 * @param {Object} defaultConfig 默认配置 the default config for the instance
 */
function createInstance(defaultConfig) {
    return new Request(defaultConfig)
}

// Create a new instance
var request = createInstance();

// Factory for creating new instances
request.create = function (config) {
    return createInstance(config);
}

/**
 * Determine if a value is an Array
 * 
 * @param {Object} val The value to test
 * 
 * @returns {boolean} True if value is Array, otherwise false
 */
function isArray(val) {
    return toString.call(val) === '[object Array]';
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
    // Dont't bother if no value provided
    if (obj === null || typeof obj === 'undefined') {
        return;
    }

    if (typeof obj !== 'object') {
        obj = [obj]
    }

    if (isArray(obj)) {
        for (var i = 0, l = obj.length; i < l; i++) {
            fn.call(null, obj[i], i, obj);
        }
    } else {
        for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                fn.call(null, obj[key], key, obj)
            }
        }
    }
}

forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
    Request.prototype[method] = function (url, config) {
        return this.request({
            ...config || {},
            method: method,
            url: url
        })
    }
})

forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
    Request.prototype[method] = function (url, data, config) {
        return this.request({
            ...config || {},
            method: method,
            url: url,
            data: data
        })
    }
})

module.exports = request