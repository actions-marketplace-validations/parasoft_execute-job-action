require('./sourcemap-register.js');module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 109:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/// <reference path="../typings/parasoft-em-api.d.ts" />
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.run = void 0;
const core = __importStar(__nccwpck_require__(186));
const service = __importStar(__nccwpck_require__(511));
const report = __importStar(__nccwpck_require__(269));
function extractEnvironmentNames(job) {
    let separate = job.fork, lastTestId = null, environmentNames = [];
    job.testScenarioInstances.forEach((instance => {
        let testScenarioId = instance.testScenarioId, variableset = instance.variableSet;
        if (separate || (lastTestId == null || lastTestId === testScenarioId)) {
            environmentNames.push(variableset);
        }
        lastTestId = testScenarioId;
    }));
    return environmentNames;
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const ctpEndpoint = core.getInput('ctpUrl', { required: true });
        const ctpUsername = core.getInput('ctpUsername', { required: true });
        const ctpPassword = core.getInput('ctpPassword', { required: true });
        const ctpService = new service.WebService(ctpEndpoint, 'em', { username: ctpUsername, password: ctpPassword });
        let dtpService = null;
        const publish = core.getInput('publishReport') === 'true';
        const dtpEndpoint = core.getInput('dtpUrl', { required: false });
        var dtpAuthorization = null;
        if (dtpEndpoint) {
            dtpAuthorization = { username: core.getInput('dtpUsername'), password: core.getInput('dtpPassword') };
        }
        const dtpProject = core.getInput('dtpProject');
        const dtpBuildId = core.getInput('buildId');
        let dtpSessionTag = core.getInput('sessionTag');
        const appendEnvironment = core.getInput('appendEnvironment') === 'true';
        if (dtpEndpoint && publish) {
            let metaData = {
                dtpProject: dtpProject,
                dtpBuildId: dtpBuildId,
                dtpSessionTag: dtpSessionTag,
                appendEnvironment: appendEnvironment
            };
            dtpService = new report.ReportPublisher(dtpEndpoint, 'grs', ctpService, metaData, dtpAuthorization);
        }
        const abortOnTimout = core.getInput('abortOnTimeout') === 'true';
        const timeout = core.getInput('timeoutInMinutes');
        const jobName = core.getInput('ctpJob', { required: true });
        let job;
        ctpService.performGET('/api/v2/jobs', (res, def, responseStr) => {
            core.info(`    response ${res.statusCode}: ${responseStr}`);
            let allJobs = JSON.parse(responseStr);
            if (typeof allJobs.jobs === 'undefined') {
                def.reject('jobs' + ' does not exist in response object from /api/v2/jobs');
                return;
            }
            let match = allJobs.jobs.find(job => job.name === jobName);
            if (match) {
                def.resolve(match);
                return;
            }
            def.reject(`Could not find name ${jobName} in jobs from /api/v2/jobs`);
        }).then((response) => {
            core.info(`Found job ${response.name} with id ${response.id}`);
            job = response;
            return ctpService.performPOST(`/api/v2/jobs/${job.id}/histories?async=true`, {});
        }).then((res) => {
            let historyId = res.id;
            let status = res.status;
            let startTime = new Date().getTime();
            let checkStatus = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    ctpService.performGET(`/api/v2/jobs/${job.id}/histories/${historyId}`).then((res) => {
                        status = res.status;
                        if (abortOnTimout) {
                            let timespent = (new Date().getTime() - startTime) / 60000, timeoutNum = parseInt(timeout);
                            if (timespent > timeoutNum) {
                                ctpService.performPUT(`/api/v2/jobs/${job.id}/histories/${historyId}`, { status: 'CANCELED' });
                                core.error(`Test execution job timed out after ${timeoutNum} minute"${timeoutNum > 1 ? 's' : ""}.`);
                                core.setFailed('Job ' + jobName + ' timed out.');
                                return;
                            }
                        }
                        if (status === 'RUNNING' || status === 'WAITING') {
                            setTimeout(checkStatus, 1000);
                        }
                        else if (status === 'PASSED') {
                            core.info('Job ' + jobName + ' passed.');
                            if (dtpService) {
                                let environmentNames = extractEnvironmentNames(job);
                                res.reportIds.forEach((reportId, index) => {
                                    dtpService.publishReport(reportId, index, environmentNames.length > 0 ? environmentNames.shift() : null).catch((err) => {
                                        core.error("Failed to publish report to DTP");
                                    }).then(() => {
                                        if (index === 0) {
                                            console.log('   View results in DTP: ' + dtpService.getBaseURL() + '/dtp/explorers/test?buildId=' + dtpBuildId);
                                        }
                                    });
                                });
                                core.info(`   View results in DTP: ${this.getBaseURL()}/dtp/explorers/test?buildId=${this.metaData.dtpBuildId}`);
                            }
                        }
                        else if (status === 'CANCELED') {
                            core.warning('Job ' + jobName + ' canceled.');
                        }
                        else {
                            core.error('Job ' + jobName + ' failed.');
                            if (dtpService) {
                                res.reportIds.forEach((reportId, index) => {
                                    core.info(`    report location: /testreport/${reportId}/report.xml`);
                                    let environmentNames = extractEnvironmentNames(job);
                                    dtpService.publishReport(reportId, index, environmentNames.length > 0 ? environmentNames.shift() : null).catch((err) => {
                                        core.error("Failed to publish report to DTP");
                                    }).then(() => {
                                        if (index === 0) {
                                            console.log('   View results in DTP: ' + dtpService.getBaseURL() + '/dtp/explorers/test?buildId=' + dtpBuildId);
                                        }
                                    });
                                });
                                core.info(`   View results in DTP: ${this.getBaseURL()}/dtp/explorers/test?buildId=${this.metaData.dtpBuildId}`);
                            }
                            core.setFailed('Job ' + jobName + ' failed.');
                        }
                    });
                });
            };
            if (status === 'RUNNING' || status === 'WAITING') {
                setTimeout(checkStatus, 1000);
            }
        }).catch((e) => {
            core.error(e);
            core.setFailed(e);
        });
    });
}
exports.run = run;
run();


/***/ }),

/***/ 269:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReportPublisher = void 0;
const service = __importStar(__nccwpck_require__(511));
const q_1 = __importDefault(__nccwpck_require__(172));
const form_data_1 = __importDefault(__nccwpck_require__(334));
const fs_1 = __importDefault(__nccwpck_require__(747));
const url_1 = __importDefault(__nccwpck_require__(835));
const core = __importStar(__nccwpck_require__(186));
class ReportPublisher extends service.WebService {
    constructor(endpoint, context, ctpService, metaData, authorization) {
        super(endpoint, context, authorization);
        this.ctpService = ctpService;
        this.metaData = metaData;
    }
    uploadFile(reportId) {
        let def = q_1.default.defer();
        this.performGET('/api/v1.6/services').then((response) => {
            let dataCollectorURL = url_1.default.parse(response.services.dataCollectorV2);
            let form = new form_data_1.default();
            let protocol = dataCollectorURL.protocol === 'https:' ? 'https:' : 'http:';
            form.append('file', fs_1.default.createReadStream(`target/parasoft/soatest/${reportId}/report.xml`));
            let options = {
                host: dataCollectorURL.hostname,
                port: parseInt(dataCollectorURL.port),
                path: dataCollectorURL.path,
                method: 'POST',
                protocol: protocol,
                headers: form.getHeaders()
            };
            if (protocol === 'https:') {
                options['rejectUnauthorized'] = false;
                options['agent'] = false;
                if (this.authorization && this.authorization['username']) {
                    options.auth = this.authorization['username'] + ':' + this.authorization['password'];
                }
            }
            core.info(`POST ${options.protocol}//${options.host}${options.port ? `:${options.port}` : ""}${options.path}`);
            form.submit(options, (err, res) => {
                if (err) {
                    return def.reject(new Error(err.message));
                }
                if (res.statusCode < 200 || res.statusCode > 299) {
                    return def.reject(new Error(`HTTP status code ${res.statusCode}`));
                }
                let body = [];
                res.on('data', (chunk) => body.push(chunk));
                res.on('end', () => {
                    let resString = Buffer.concat(body).toString();
                    def.resolve(resString);
                });
            });
        }).catch((error) => {
            def.reject(error);
        });
        return def.promise;
    }
    publishReport(reportId, index, environmentName) {
        let def = q_1.default.defer(), firstCallback = true;
        this.ctpService.performGET(`/testreport/${reportId}/report.xml`, (res, def, responseStr) => {
            def.resolve(responseStr);
        }, (response) => {
            let fileData = response;
            if (firstCallback) {
                fileData = this.injectMetaData(fileData, index, this.metaData.appendEnvironment ? environmentName : null);
                firstCallback = false;
            }
            if (!fs_1.default.existsSync('target')) {
                fs_1.default.mkdirSync('target');
            }
            if (!fs_1.default.existsSync('target/parasoft')) {
                fs_1.default.mkdirSync('target/parasoft');
            }
            if (!fs_1.default.existsSync('target/parasoft/soatest')) {
                fs_1.default.mkdirSync('target/parasoft/soatest');
            }
            if (!fs_1.default.existsSync(`target/parasoft/soatest/${reportId}`)) {
                fs_1.default.mkdirSync(`target/parasoft/soatest/${reportId}`);
            }
            try {
                fs_1.default.appendFileSync(`target/parasoft/soatest/${reportId}/report.xml`, fileData);
            }
            catch (error) {
                core.error(`Error writing report.xml: ${error.message}`);
            }
            return '';
        }).then(() => {
            core.info(`    Saved XML report: target/parasoft/soatest/${reportId}/report.xml`);
            core.info(`    View report:  ${this.ctpService.getBaseURL()}/testreport/${reportId}/report.html`);
            this.uploadFile(reportId).then(response => {
                core.info(`   report.xml file upload successful: ${response}`);
                def.resolve();
            }).catch((error) => {
                core.error(`Error while uploading report.xml file: ${error}`);
                def.reject(error);
            });
        });
        return def.promise;
    }
    injectMetaData(source, index, environmentName) {
        let dtpSessionTag = this.metaData.dtpSessionTag;
        if (environmentName) {
            if (dtpSessionTag == null) {
                dtpSessionTag = "";
            }
            if (dtpSessionTag.length != 0) {
                dtpSessionTag += '-';
            }
            dtpSessionTag += environmentName;
        }
        else if ((dtpSessionTag != null) && dtpSessionTag.length !== 0 && (index > 0)) {
            dtpSessionTag += `-${index + 1}`; // unique session tag in DTP for each report
        }
        source = this.replaceAttributeValue(source, 'project', this.metaData.dtpProject);
        source = this.replaceAttributeValue(source, 'buildId', this.metaData.dtpBuildId);
        source = this.replaceAttributeValue(source, 'tag', dtpSessionTag);
        return this.replaceAttributeValue(source, 'execEnv', environmentName);
    }
    replaceAttributeValue(source, attribute, newValue) {
        let regEx = new RegExp(attribute + '\=\"[^"]*\"');
        return source.replace(regEx, attribute + '="' + newValue + '"');
    }
}
exports.ReportPublisher = ReportPublisher;


/***/ }),

/***/ 511:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WebService = void 0;
const core = __importStar(__nccwpck_require__(186));
const http_1 = __importDefault(__nccwpck_require__(605));
const https_1 = __importDefault(__nccwpck_require__(211));
const url_1 = __importDefault(__nccwpck_require__(835));
const q_1 = __importDefault(__nccwpck_require__(172));
class WebService {
    constructor(endpoint, context, authorization) {
        this.baseURL = url_1.default.parse(endpoint);
        if (this.baseURL.path === '/') {
            this.baseURL.path += context;
        }
        else if (this.baseURL.path === `/${context}/`) {
            this.baseURL.path = `/${context}`;
        }
        this.authorization = authorization;
        this.protocol = this.baseURL.protocol === 'https:' ? https_1.default : http_1.default;
        this.protocolLabel = this.baseURL.protocol || 'http:';
    }
    performTest(path) {
        return new Promise((resolve, reject) => {
            resolve('value');
        });
    }
    performGET(path, handler, dataHandler) {
        let def = q_1.default.defer();
        let promise = new Promise((resolve, reject) => {
            def.resolve = resolve;
            def.reject = reject;
        });
        let options = {
            host: this.baseURL.hostname,
            path: this.baseURL.path + path,
            auth: undefined,
            headers: {
                'Accept': 'application/json'
            }
        };
        if (this.baseURL.port) {
            options.port = parseInt(this.baseURL.port);
        }
        if (this.protocolLabel === 'https:') {
            options['rejectUnauthorized'] = false;
            options['agent'] = false;
        }
        if (this.authorization && this.authorization['username']) {
            options.auth = this.authorization['username'] + ':' + this.authorization['password'];
        }
        core.info(`GET ${this.protocolLabel}//${options.host}${options.port ? `:${options.port}` : ""}${options.path}`);
        let responseString = "";
        this.protocol.get(options, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                if (dataHandler) {
                    responseString += dataHandler(chunk);
                }
                else {
                    responseString += chunk;
                }
            });
            res.on('end', () => {
                if (res.statusCode === 302) {
                    let redirectPath = res.headers.location;
                    if (redirectPath.startsWith(this.baseURL.path)) {
                        redirectPath = redirectPath.substring(3);
                    }
                    core.info('    redirect to "' + redirectPath + '"');
                    this.performGET(redirectPath, handler, dataHandler).then(response => def.resolve(response));
                }
                else if (handler) {
                    handler(res, def, responseString);
                }
                else {
                    core.info(`   response ${res.statusCode}: ${responseString}`);
                    let responseObject = JSON.parse(responseString);
                    def.resolve(responseObject);
                }
            });
        }).on('error', (e) => {
            def.reject(e);
        });
        return promise;
    }
    getBaseURL() {
        return this.protocolLabel + '//' + this.baseURL.hostname +
            (this.baseURL.port ? ':' + this.baseURL.port : "") + this.baseURL.path;
    }
    performPUT(path, data) {
        return this.performRequest(path, data, 'PUT');
    }
    performPOST(path, data) {
        return this.performRequest(path, data, 'POST');
    }
    performRequest(path, data, method) {
        let def = q_1.default.defer();
        let promise = new Promise((resolve, reject) => {
            def.resolve = resolve;
            def.reject = reject;
        });
        let options = {
            host: this.baseURL.hostname,
            path: this.baseURL.path + path,
            method: method,
            auth: undefined,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };
        if (this.baseURL.port) {
            options.port = parseInt(this.baseURL.port);
        }
        if (this.protocolLabel === 'https:') {
            options['rejectUnauthorized'] = false;
            options['agent'] = false;
        }
        if (this.authorization && this.authorization['username']) {
            options.auth = this.authorization['username'] + ':' + this.authorization['password'];
        }
        core.info(`${method} ${this.protocolLabel}//${options.host}${options.port ? `:${options.port}` : ""}${options.path}`);
        let responseString = "";
        let req = this.protocol.request(options, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                responseString += chunk;
            });
            res.on('end', () => {
                core.info(`    response ${res.statusCode}: ${responseString}`);
                let responseObject = JSON.parse(responseString);
                def.resolve(responseObject);
            });
        }).on('error', (e) => {
            def.reject(e);
        });
        req.write(JSON.stringify(data));
        req.end();
        return promise;
    }
}
exports.WebService = WebService;


/***/ }),

/***/ 351:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const os = __importStar(__nccwpck_require__(87));
const utils_1 = __nccwpck_require__(278);
/**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */
function issueCommand(command, properties, message) {
    const cmd = new Command(command, properties, message);
    process.stdout.write(cmd.toString() + os.EOL);
}
exports.issueCommand = issueCommand;
function issue(name, message = '') {
    issueCommand(name, {}, message);
}
exports.issue = issue;
const CMD_STRING = '::';
class Command {
    constructor(command, properties, message) {
        if (!command) {
            command = 'missing.command';
        }
        this.command = command;
        this.properties = properties;
        this.message = message;
    }
    toString() {
        let cmdStr = CMD_STRING + this.command;
        if (this.properties && Object.keys(this.properties).length > 0) {
            cmdStr += ' ';
            let first = true;
            for (const key in this.properties) {
                if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        if (first) {
                            first = false;
                        }
                        else {
                            cmdStr += ',';
                        }
                        cmdStr += `${key}=${escapeProperty(val)}`;
                    }
                }
            }
        }
        cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
        return cmdStr;
    }
}
function escapeData(s) {
    return utils_1.toCommandValue(s)
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A');
}
function escapeProperty(s) {
    return utils_1.toCommandValue(s)
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A')
        .replace(/:/g, '%3A')
        .replace(/,/g, '%2C');
}
//# sourceMappingURL=command.js.map

/***/ }),

/***/ 186:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const command_1 = __nccwpck_require__(351);
const file_command_1 = __nccwpck_require__(717);
const utils_1 = __nccwpck_require__(278);
const os = __importStar(__nccwpck_require__(87));
const path = __importStar(__nccwpck_require__(622));
/**
 * The code to exit an action
 */
var ExitCode;
(function (ExitCode) {
    /**
     * A code indicating that the action was successful
     */
    ExitCode[ExitCode["Success"] = 0] = "Success";
    /**
     * A code indicating that the action was a failure
     */
    ExitCode[ExitCode["Failure"] = 1] = "Failure";
})(ExitCode = exports.ExitCode || (exports.ExitCode = {}));
//-----------------------------------------------------------------------
// Variables
//-----------------------------------------------------------------------
/**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportVariable(name, val) {
    const convertedVal = utils_1.toCommandValue(val);
    process.env[name] = convertedVal;
    const filePath = process.env['GITHUB_ENV'] || '';
    if (filePath) {
        const delimiter = '_GitHubActionsFileCommandDelimeter_';
        const commandValue = `${name}<<${delimiter}${os.EOL}${convertedVal}${os.EOL}${delimiter}`;
        file_command_1.issueCommand('ENV', commandValue);
    }
    else {
        command_1.issueCommand('set-env', { name }, convertedVal);
    }
}
exports.exportVariable = exportVariable;
/**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */
function setSecret(secret) {
    command_1.issueCommand('add-mask', {}, secret);
}
exports.setSecret = setSecret;
/**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */
function addPath(inputPath) {
    const filePath = process.env['GITHUB_PATH'] || '';
    if (filePath) {
        file_command_1.issueCommand('PATH', inputPath);
    }
    else {
        command_1.issueCommand('add-path', {}, inputPath);
    }
    process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`;
}
exports.addPath = addPath;
/**
 * Gets the value of an input.  The value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */
function getInput(name, options) {
    const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
    if (options && options.required && !val) {
        throw new Error(`Input required and not supplied: ${name}`);
    }
    return val.trim();
}
exports.getInput = getInput;
/**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setOutput(name, value) {
    command_1.issueCommand('set-output', { name }, value);
}
exports.setOutput = setOutput;
/**
 * Enables or disables the echoing of commands into stdout for the rest of the step.
 * Echoing is disabled by default if ACTIONS_STEP_DEBUG is not set.
 *
 */
function setCommandEcho(enabled) {
    command_1.issue('echo', enabled ? 'on' : 'off');
}
exports.setCommandEcho = setCommandEcho;
//-----------------------------------------------------------------------
// Results
//-----------------------------------------------------------------------
/**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */
function setFailed(message) {
    process.exitCode = ExitCode.Failure;
    error(message);
}
exports.setFailed = setFailed;
//-----------------------------------------------------------------------
// Logging Commands
//-----------------------------------------------------------------------
/**
 * Gets whether Actions Step Debug is on or not
 */
function isDebug() {
    return process.env['RUNNER_DEBUG'] === '1';
}
exports.isDebug = isDebug;
/**
 * Writes debug message to user log
 * @param message debug message
 */
function debug(message) {
    command_1.issueCommand('debug', {}, message);
}
exports.debug = debug;
/**
 * Adds an error issue
 * @param message error issue message. Errors will be converted to string via toString()
 */
function error(message) {
    command_1.issue('error', message instanceof Error ? message.toString() : message);
}
exports.error = error;
/**
 * Adds an warning issue
 * @param message warning issue message. Errors will be converted to string via toString()
 */
function warning(message) {
    command_1.issue('warning', message instanceof Error ? message.toString() : message);
}
exports.warning = warning;
/**
 * Writes info to log with console.log.
 * @param message info message
 */
function info(message) {
    process.stdout.write(message + os.EOL);
}
exports.info = info;
/**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */
function startGroup(name) {
    command_1.issue('group', name);
}
exports.startGroup = startGroup;
/**
 * End an output group.
 */
function endGroup() {
    command_1.issue('endgroup');
}
exports.endGroup = endGroup;
/**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */
function group(name, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        startGroup(name);
        let result;
        try {
            result = yield fn();
        }
        finally {
            endGroup();
        }
        return result;
    });
}
exports.group = group;
//-----------------------------------------------------------------------
// Wrapper action state
//-----------------------------------------------------------------------
/**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveState(name, value) {
    command_1.issueCommand('save-state', { name }, value);
}
exports.saveState = saveState;
/**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */
function getState(name) {
    return process.env[`STATE_${name}`] || '';
}
exports.getState = getState;
//# sourceMappingURL=core.js.map

/***/ }),

/***/ 717:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

// For internal use, subject to change.
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
// We use any as a valid input type
/* eslint-disable @typescript-eslint/no-explicit-any */
const fs = __importStar(__nccwpck_require__(747));
const os = __importStar(__nccwpck_require__(87));
const utils_1 = __nccwpck_require__(278);
function issueCommand(command, message) {
    const filePath = process.env[`GITHUB_${command}`];
    if (!filePath) {
        throw new Error(`Unable to find environment variable for file command ${command}`);
    }
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file at path: ${filePath}`);
    }
    fs.appendFileSync(filePath, `${utils_1.toCommandValue(message)}${os.EOL}`, {
        encoding: 'utf8'
    });
}
exports.issueCommand = issueCommand;
//# sourceMappingURL=file-command.js.map

/***/ }),

/***/ 278:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

// We use any as a valid input type
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */
function toCommandValue(input) {
    if (input === null || input === undefined) {
        return '';
    }
    else if (typeof input === 'string' || input instanceof String) {
        return input;
    }
    return JSON.stringify(input);
}
exports.toCommandValue = toCommandValue;
//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 812:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports =
{
  parallel      : __nccwpck_require__(210),
  serial        : __nccwpck_require__(445),
  serialOrdered : __nccwpck_require__(578)
};


/***/ }),

/***/ 700:
/***/ ((module) => {

// API
module.exports = abort;

/**
 * Aborts leftover active jobs
 *
 * @param {object} state - current state object
 */
function abort(state)
{
  Object.keys(state.jobs).forEach(clean.bind(state));

  // reset leftover jobs
  state.jobs = {};
}

/**
 * Cleans up leftover job by invoking abort function for the provided job id
 *
 * @this  state
 * @param {string|number} key - job id to abort
 */
function clean(key)
{
  if (typeof this.jobs[key] == 'function')
  {
    this.jobs[key]();
  }
}


/***/ }),

/***/ 794:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var defer = __nccwpck_require__(295);

// API
module.exports = async;

/**
 * Runs provided callback asynchronously
 * even if callback itself is not
 *
 * @param   {function} callback - callback to invoke
 * @returns {function} - augmented callback
 */
function async(callback)
{
  var isAsync = false;

  // check if async happened
  defer(function() { isAsync = true; });

  return function async_callback(err, result)
  {
    if (isAsync)
    {
      callback(err, result);
    }
    else
    {
      defer(function nextTick_callback()
      {
        callback(err, result);
      });
    }
  };
}


/***/ }),

/***/ 295:
/***/ ((module) => {

module.exports = defer;

/**
 * Runs provided function on next iteration of the event loop
 *
 * @param {function} fn - function to run
 */
function defer(fn)
{
  var nextTick = typeof setImmediate == 'function'
    ? setImmediate
    : (
      typeof process == 'object' && typeof process.nextTick == 'function'
      ? process.nextTick
      : null
    );

  if (nextTick)
  {
    nextTick(fn);
  }
  else
  {
    setTimeout(fn, 0);
  }
}


/***/ }),

/***/ 23:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var async = __nccwpck_require__(794)
  , abort = __nccwpck_require__(700)
  ;

// API
module.exports = iterate;

/**
 * Iterates over each job object
 *
 * @param {array|object} list - array or object (named list) to iterate over
 * @param {function} iterator - iterator to run
 * @param {object} state - current job status
 * @param {function} callback - invoked when all elements processed
 */
function iterate(list, iterator, state, callback)
{
  // store current index
  var key = state['keyedList'] ? state['keyedList'][state.index] : state.index;

  state.jobs[key] = runJob(iterator, key, list[key], function(error, output)
  {
    // don't repeat yourself
    // skip secondary callbacks
    if (!(key in state.jobs))
    {
      return;
    }

    // clean up jobs
    delete state.jobs[key];

    if (error)
    {
      // don't process rest of the results
      // stop still active jobs
      // and reset the list
      abort(state);
    }
    else
    {
      state.results[key] = output;
    }

    // return salvaged results
    callback(error, state.results);
  });
}

/**
 * Runs iterator over provided job element
 *
 * @param   {function} iterator - iterator to invoke
 * @param   {string|number} key - key/index of the element in the list of jobs
 * @param   {mixed} item - job description
 * @param   {function} callback - invoked after iterator is done with the job
 * @returns {function|mixed} - job abort function or something else
 */
function runJob(iterator, key, item, callback)
{
  var aborter;

  // allow shortcut if iterator expects only two arguments
  if (iterator.length == 2)
  {
    aborter = iterator(item, async(callback));
  }
  // otherwise go with full three arguments
  else
  {
    aborter = iterator(item, key, async(callback));
  }

  return aborter;
}


/***/ }),

/***/ 474:
/***/ ((module) => {

// API
module.exports = state;

/**
 * Creates initial state object
 * for iteration over list
 *
 * @param   {array|object} list - list to iterate over
 * @param   {function|null} sortMethod - function to use for keys sort,
 *                                     or `null` to keep them as is
 * @returns {object} - initial state object
 */
function state(list, sortMethod)
{
  var isNamedList = !Array.isArray(list)
    , initState =
    {
      index    : 0,
      keyedList: isNamedList || sortMethod ? Object.keys(list) : null,
      jobs     : {},
      results  : isNamedList ? {} : [],
      size     : isNamedList ? Object.keys(list).length : list.length
    }
    ;

  if (sortMethod)
  {
    // sort array keys based on it's values
    // sort object's keys just on own merit
    initState.keyedList.sort(isNamedList ? sortMethod : function(a, b)
    {
      return sortMethod(list[a], list[b]);
    });
  }

  return initState;
}


/***/ }),

/***/ 942:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var abort = __nccwpck_require__(700)
  , async = __nccwpck_require__(794)
  ;

// API
module.exports = terminator;

/**
 * Terminates jobs in the attached state context
 *
 * @this  AsyncKitState#
 * @param {function} callback - final callback to invoke after termination
 */
function terminator(callback)
{
  if (!Object.keys(this.jobs).length)
  {
    return;
  }

  // fast forward iteration index
  this.index = this.size;

  // abort jobs
  abort(this);

  // send back results we have so far
  async(callback)(null, this.results);
}


/***/ }),

/***/ 210:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var iterate    = __nccwpck_require__(23)
  , initState  = __nccwpck_require__(474)
  , terminator = __nccwpck_require__(942)
  ;

// Public API
module.exports = parallel;

/**
 * Runs iterator over provided array elements in parallel
 *
 * @param   {array|object} list - array or object (named list) to iterate over
 * @param   {function} iterator - iterator to run
 * @param   {function} callback - invoked when all elements processed
 * @returns {function} - jobs terminator
 */
function parallel(list, iterator, callback)
{
  var state = initState(list);

  while (state.index < (state['keyedList'] || list).length)
  {
    iterate(list, iterator, state, function(error, result)
    {
      if (error)
      {
        callback(error, result);
        return;
      }

      // looks like it's the last one
      if (Object.keys(state.jobs).length === 0)
      {
        callback(null, state.results);
        return;
      }
    });

    state.index++;
  }

  return terminator.bind(state, callback);
}


/***/ }),

/***/ 445:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var serialOrdered = __nccwpck_require__(578);

// Public API
module.exports = serial;

/**
 * Runs iterator over provided array elements in series
 *
 * @param   {array|object} list - array or object (named list) to iterate over
 * @param   {function} iterator - iterator to run
 * @param   {function} callback - invoked when all elements processed
 * @returns {function} - jobs terminator
 */
function serial(list, iterator, callback)
{
  return serialOrdered(list, iterator, null, callback);
}


/***/ }),

/***/ 578:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var iterate    = __nccwpck_require__(23)
  , initState  = __nccwpck_require__(474)
  , terminator = __nccwpck_require__(942)
  ;

// Public API
module.exports = serialOrdered;
// sorting helpers
module.exports.ascending  = ascending;
module.exports.descending = descending;

/**
 * Runs iterator over provided sorted array elements in series
 *
 * @param   {array|object} list - array or object (named list) to iterate over
 * @param   {function} iterator - iterator to run
 * @param   {function} sortMethod - custom sort function
 * @param   {function} callback - invoked when all elements processed
 * @returns {function} - jobs terminator
 */
function serialOrdered(list, iterator, sortMethod, callback)
{
  var state = initState(list, sortMethod);

  iterate(list, iterator, state, function iteratorHandler(error, result)
  {
    if (error)
    {
      callback(error, result);
      return;
    }

    state.index++;

    // are we there yet?
    if (state.index < (state['keyedList'] || list).length)
    {
      iterate(list, iterator, state, iteratorHandler);
      return;
    }

    // done here
    callback(null, state.results);
  });

  return terminator.bind(state, callback);
}

/*
 * -- Sort methods
 */

/**
 * sort helper to sort array elements in ascending order
 *
 * @param   {mixed} a - an item to compare
 * @param   {mixed} b - an item to compare
 * @returns {number} - comparison result
 */
function ascending(a, b)
{
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * sort helper to sort array elements in descending order
 *
 * @param   {mixed} a - an item to compare
 * @param   {mixed} b - an item to compare
 * @returns {number} - comparison result
 */
function descending(a, b)
{
  return -1 * ascending(a, b);
}


/***/ }),

/***/ 443:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var util = __nccwpck_require__(669);
var Stream = __nccwpck_require__(413).Stream;
var DelayedStream = __nccwpck_require__(611);

module.exports = CombinedStream;
function CombinedStream() {
  this.writable = false;
  this.readable = true;
  this.dataSize = 0;
  this.maxDataSize = 2 * 1024 * 1024;
  this.pauseStreams = true;

  this._released = false;
  this._streams = [];
  this._currentStream = null;
  this._insideLoop = false;
  this._pendingNext = false;
}
util.inherits(CombinedStream, Stream);

CombinedStream.create = function(options) {
  var combinedStream = new this();

  options = options || {};
  for (var option in options) {
    combinedStream[option] = options[option];
  }

  return combinedStream;
};

CombinedStream.isStreamLike = function(stream) {
  return (typeof stream !== 'function')
    && (typeof stream !== 'string')
    && (typeof stream !== 'boolean')
    && (typeof stream !== 'number')
    && (!Buffer.isBuffer(stream));
};

CombinedStream.prototype.append = function(stream) {
  var isStreamLike = CombinedStream.isStreamLike(stream);

  if (isStreamLike) {
    if (!(stream instanceof DelayedStream)) {
      var newStream = DelayedStream.create(stream, {
        maxDataSize: Infinity,
        pauseStream: this.pauseStreams,
      });
      stream.on('data', this._checkDataSize.bind(this));
      stream = newStream;
    }

    this._handleErrors(stream);

    if (this.pauseStreams) {
      stream.pause();
    }
  }

  this._streams.push(stream);
  return this;
};

CombinedStream.prototype.pipe = function(dest, options) {
  Stream.prototype.pipe.call(this, dest, options);
  this.resume();
  return dest;
};

CombinedStream.prototype._getNext = function() {
  this._currentStream = null;

  if (this._insideLoop) {
    this._pendingNext = true;
    return; // defer call
  }

  this._insideLoop = true;
  try {
    do {
      this._pendingNext = false;
      this._realGetNext();
    } while (this._pendingNext);
  } finally {
    this._insideLoop = false;
  }
};

CombinedStream.prototype._realGetNext = function() {
  var stream = this._streams.shift();


  if (typeof stream == 'undefined') {
    this.end();
    return;
  }

  if (typeof stream !== 'function') {
    this._pipeNext(stream);
    return;
  }

  var getStream = stream;
  getStream(function(stream) {
    var isStreamLike = CombinedStream.isStreamLike(stream);
    if (isStreamLike) {
      stream.on('data', this._checkDataSize.bind(this));
      this._handleErrors(stream);
    }

    this._pipeNext(stream);
  }.bind(this));
};

CombinedStream.prototype._pipeNext = function(stream) {
  this._currentStream = stream;

  var isStreamLike = CombinedStream.isStreamLike(stream);
  if (isStreamLike) {
    stream.on('end', this._getNext.bind(this));
    stream.pipe(this, {end: false});
    return;
  }

  var value = stream;
  this.write(value);
  this._getNext();
};

CombinedStream.prototype._handleErrors = function(stream) {
  var self = this;
  stream.on('error', function(err) {
    self._emitError(err);
  });
};

CombinedStream.prototype.write = function(data) {
  this.emit('data', data);
};

CombinedStream.prototype.pause = function() {
  if (!this.pauseStreams) {
    return;
  }

  if(this.pauseStreams && this._currentStream && typeof(this._currentStream.pause) == 'function') this._currentStream.pause();
  this.emit('pause');
};

CombinedStream.prototype.resume = function() {
  if (!this._released) {
    this._released = true;
    this.writable = true;
    this._getNext();
  }

  if(this.pauseStreams && this._currentStream && typeof(this._currentStream.resume) == 'function') this._currentStream.resume();
  this.emit('resume');
};

CombinedStream.prototype.end = function() {
  this._reset();
  this.emit('end');
};

CombinedStream.prototype.destroy = function() {
  this._reset();
  this.emit('close');
};

CombinedStream.prototype._reset = function() {
  this.writable = false;
  this._streams = [];
  this._currentStream = null;
};

CombinedStream.prototype._checkDataSize = function() {
  this._updateDataSize();
  if (this.dataSize <= this.maxDataSize) {
    return;
  }

  var message =
    'DelayedStream#maxDataSize of ' + this.maxDataSize + ' bytes exceeded.';
  this._emitError(new Error(message));
};

CombinedStream.prototype._updateDataSize = function() {
  this.dataSize = 0;

  var self = this;
  this._streams.forEach(function(stream) {
    if (!stream.dataSize) {
      return;
    }

    self.dataSize += stream.dataSize;
  });

  if (this._currentStream && this._currentStream.dataSize) {
    this.dataSize += this._currentStream.dataSize;
  }
};

CombinedStream.prototype._emitError = function(err) {
  this._reset();
  this.emit('error', err);
};


/***/ }),

/***/ 611:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var Stream = __nccwpck_require__(413).Stream;
var util = __nccwpck_require__(669);

module.exports = DelayedStream;
function DelayedStream() {
  this.source = null;
  this.dataSize = 0;
  this.maxDataSize = 1024 * 1024;
  this.pauseStream = true;

  this._maxDataSizeExceeded = false;
  this._released = false;
  this._bufferedEvents = [];
}
util.inherits(DelayedStream, Stream);

DelayedStream.create = function(source, options) {
  var delayedStream = new this();

  options = options || {};
  for (var option in options) {
    delayedStream[option] = options[option];
  }

  delayedStream.source = source;

  var realEmit = source.emit;
  source.emit = function() {
    delayedStream._handleEmit(arguments);
    return realEmit.apply(source, arguments);
  };

  source.on('error', function() {});
  if (delayedStream.pauseStream) {
    source.pause();
  }

  return delayedStream;
};

Object.defineProperty(DelayedStream.prototype, 'readable', {
  configurable: true,
  enumerable: true,
  get: function() {
    return this.source.readable;
  }
});

DelayedStream.prototype.setEncoding = function() {
  return this.source.setEncoding.apply(this.source, arguments);
};

DelayedStream.prototype.resume = function() {
  if (!this._released) {
    this.release();
  }

  this.source.resume();
};

DelayedStream.prototype.pause = function() {
  this.source.pause();
};

DelayedStream.prototype.release = function() {
  this._released = true;

  this._bufferedEvents.forEach(function(args) {
    this.emit.apply(this, args);
  }.bind(this));
  this._bufferedEvents = [];
};

DelayedStream.prototype.pipe = function() {
  var r = Stream.prototype.pipe.apply(this, arguments);
  this.resume();
  return r;
};

DelayedStream.prototype._handleEmit = function(args) {
  if (this._released) {
    this.emit.apply(this, args);
    return;
  }

  if (args[0] === 'data') {
    this.dataSize += args[1].length;
    this._checkIfMaxDataSizeExceeded();
  }

  this._bufferedEvents.push(args);
};

DelayedStream.prototype._checkIfMaxDataSizeExceeded = function() {
  if (this._maxDataSizeExceeded) {
    return;
  }

  if (this.dataSize <= this.maxDataSize) {
    return;
  }

  this._maxDataSizeExceeded = true;
  var message =
    'DelayedStream#maxDataSize of ' + this.maxDataSize + ' bytes exceeded.'
  this.emit('error', new Error(message));
};


/***/ }),

/***/ 334:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var CombinedStream = __nccwpck_require__(443);
var util = __nccwpck_require__(669);
var path = __nccwpck_require__(622);
var http = __nccwpck_require__(605);
var https = __nccwpck_require__(211);
var parseUrl = __nccwpck_require__(835).parse;
var fs = __nccwpck_require__(747);
var mime = __nccwpck_require__(583);
var asynckit = __nccwpck_require__(812);
var populate = __nccwpck_require__(142);

// Public API
module.exports = FormData;

// make it a Stream
util.inherits(FormData, CombinedStream);

/**
 * Create readable "multipart/form-data" streams.
 * Can be used to submit forms
 * and file uploads to other web applications.
 *
 * @constructor
 * @param {Object} options - Properties to be added/overriden for FormData and CombinedStream
 */
function FormData(options) {
  if (!(this instanceof FormData)) {
    return new FormData(options);
  }

  this._overheadLength = 0;
  this._valueLength = 0;
  this._valuesToMeasure = [];

  CombinedStream.call(this);

  options = options || {};
  for (var option in options) {
    this[option] = options[option];
  }
}

FormData.LINE_BREAK = '\r\n';
FormData.DEFAULT_CONTENT_TYPE = 'application/octet-stream';

FormData.prototype.append = function(field, value, options) {

  options = options || {};

  // allow filename as single option
  if (typeof options == 'string') {
    options = {filename: options};
  }

  var append = CombinedStream.prototype.append.bind(this);

  // all that streamy business can't handle numbers
  if (typeof value == 'number') {
    value = '' + value;
  }

  // https://github.com/felixge/node-form-data/issues/38
  if (util.isArray(value)) {
    // Please convert your array into string
    // the way web server expects it
    this._error(new Error('Arrays are not supported.'));
    return;
  }

  var header = this._multiPartHeader(field, value, options);
  var footer = this._multiPartFooter();

  append(header);
  append(value);
  append(footer);

  // pass along options.knownLength
  this._trackLength(header, value, options);
};

FormData.prototype._trackLength = function(header, value, options) {
  var valueLength = 0;

  // used w/ getLengthSync(), when length is known.
  // e.g. for streaming directly from a remote server,
  // w/ a known file a size, and not wanting to wait for
  // incoming file to finish to get its size.
  if (options.knownLength != null) {
    valueLength += +options.knownLength;
  } else if (Buffer.isBuffer(value)) {
    valueLength = value.length;
  } else if (typeof value === 'string') {
    valueLength = Buffer.byteLength(value);
  }

  this._valueLength += valueLength;

  // @check why add CRLF? does this account for custom/multiple CRLFs?
  this._overheadLength +=
    Buffer.byteLength(header) +
    FormData.LINE_BREAK.length;

  // empty or either doesn't have path or not an http response
  if (!value || ( !value.path && !(value.readable && value.hasOwnProperty('httpVersion')) )) {
    return;
  }

  // no need to bother with the length
  if (!options.knownLength) {
    this._valuesToMeasure.push(value);
  }
};

FormData.prototype._lengthRetriever = function(value, callback) {

  if (value.hasOwnProperty('fd')) {

    // take read range into a account
    // `end` = Infinity –> read file till the end
    //
    // TODO: Looks like there is bug in Node fs.createReadStream
    // it doesn't respect `end` options without `start` options
    // Fix it when node fixes it.
    // https://github.com/joyent/node/issues/7819
    if (value.end != undefined && value.end != Infinity && value.start != undefined) {

      // when end specified
      // no need to calculate range
      // inclusive, starts with 0
      callback(null, value.end + 1 - (value.start ? value.start : 0));

    // not that fast snoopy
    } else {
      // still need to fetch file size from fs
      fs.stat(value.path, function(err, stat) {

        var fileSize;

        if (err) {
          callback(err);
          return;
        }

        // update final size based on the range options
        fileSize = stat.size - (value.start ? value.start : 0);
        callback(null, fileSize);
      });
    }

  // or http response
  } else if (value.hasOwnProperty('httpVersion')) {
    callback(null, +value.headers['content-length']);

  // or request stream http://github.com/mikeal/request
  } else if (value.hasOwnProperty('httpModule')) {
    // wait till response come back
    value.on('response', function(response) {
      value.pause();
      callback(null, +response.headers['content-length']);
    });
    value.resume();

  // something else
  } else {
    callback('Unknown stream');
  }
};

FormData.prototype._multiPartHeader = function(field, value, options) {
  // custom header specified (as string)?
  // it becomes responsible for boundary
  // (e.g. to handle extra CRLFs on .NET servers)
  if (typeof options.header == 'string') {
    return options.header;
  }

  var contentDisposition = this._getContentDisposition(value, options);
  var contentType = this._getContentType(value, options);

  var contents = '';
  var headers  = {
    // add custom disposition as third element or keep it two elements if not
    'Content-Disposition': ['form-data', 'name="' + field + '"'].concat(contentDisposition || []),
    // if no content type. allow it to be empty array
    'Content-Type': [].concat(contentType || [])
  };

  // allow custom headers.
  if (typeof options.header == 'object') {
    populate(headers, options.header);
  }

  var header;
  for (var prop in headers) {
    if (!headers.hasOwnProperty(prop)) continue;
    header = headers[prop];

    // skip nullish headers.
    if (header == null) {
      continue;
    }

    // convert all headers to arrays.
    if (!Array.isArray(header)) {
      header = [header];
    }

    // add non-empty headers.
    if (header.length) {
      contents += prop + ': ' + header.join('; ') + FormData.LINE_BREAK;
    }
  }

  return '--' + this.getBoundary() + FormData.LINE_BREAK + contents + FormData.LINE_BREAK;
};

FormData.prototype._getContentDisposition = function(value, options) {

  var filename
    , contentDisposition
    ;

  if (typeof options.filepath === 'string') {
    // custom filepath for relative paths
    filename = path.normalize(options.filepath).replace(/\\/g, '/');
  } else if (options.filename || value.name || value.path) {
    // custom filename take precedence
    // formidable and the browser add a name property
    // fs- and request- streams have path property
    filename = path.basename(options.filename || value.name || value.path);
  } else if (value.readable && value.hasOwnProperty('httpVersion')) {
    // or try http response
    filename = path.basename(value.client._httpMessage.path || '');
  }

  if (filename) {
    contentDisposition = 'filename="' + filename + '"';
  }

  return contentDisposition;
};

FormData.prototype._getContentType = function(value, options) {

  // use custom content-type above all
  var contentType = options.contentType;

  // or try `name` from formidable, browser
  if (!contentType && value.name) {
    contentType = mime.lookup(value.name);
  }

  // or try `path` from fs-, request- streams
  if (!contentType && value.path) {
    contentType = mime.lookup(value.path);
  }

  // or if it's http-reponse
  if (!contentType && value.readable && value.hasOwnProperty('httpVersion')) {
    contentType = value.headers['content-type'];
  }

  // or guess it from the filepath or filename
  if (!contentType && (options.filepath || options.filename)) {
    contentType = mime.lookup(options.filepath || options.filename);
  }

  // fallback to the default content type if `value` is not simple value
  if (!contentType && typeof value == 'object') {
    contentType = FormData.DEFAULT_CONTENT_TYPE;
  }

  return contentType;
};

FormData.prototype._multiPartFooter = function() {
  return function(next) {
    var footer = FormData.LINE_BREAK;

    var lastPart = (this._streams.length === 0);
    if (lastPart) {
      footer += this._lastBoundary();
    }

    next(footer);
  }.bind(this);
};

FormData.prototype._lastBoundary = function() {
  return '--' + this.getBoundary() + '--' + FormData.LINE_BREAK;
};

FormData.prototype.getHeaders = function(userHeaders) {
  var header;
  var formHeaders = {
    'content-type': 'multipart/form-data; boundary=' + this.getBoundary()
  };

  for (header in userHeaders) {
    if (userHeaders.hasOwnProperty(header)) {
      formHeaders[header.toLowerCase()] = userHeaders[header];
    }
  }

  return formHeaders;
};

FormData.prototype.getBoundary = function() {
  if (!this._boundary) {
    this._generateBoundary();
  }

  return this._boundary;
};

FormData.prototype.getBuffer = function() {
  var dataBuffer = new Buffer.alloc( 0 );
  var boundary = this.getBoundary();

  // Create the form content. Add Line breaks to the end of data.
  for (var i = 0, len = this._streams.length; i < len; i++) {
    if (typeof this._streams[i] !== 'function') {

      // Add content to the buffer.
      if(Buffer.isBuffer(this._streams[i])) {
        dataBuffer = Buffer.concat( [dataBuffer, this._streams[i]]);
      }else {
        dataBuffer = Buffer.concat( [dataBuffer, Buffer.from(this._streams[i])]);
      }

      // Add break after content.
      if (typeof this._streams[i] !== 'string' || this._streams[i].substring( 2, boundary.length + 2 ) !== boundary) {
        dataBuffer = Buffer.concat( [dataBuffer, Buffer.from(FormData.LINE_BREAK)] );
      }
    }
  }

  // Add the footer and return the Buffer object.
  return Buffer.concat( [dataBuffer, Buffer.from(this._lastBoundary())] );
};

FormData.prototype._generateBoundary = function() {
  // This generates a 50 character boundary similar to those used by Firefox.
  // They are optimized for boyer-moore parsing.
  var boundary = '--------------------------';
  for (var i = 0; i < 24; i++) {
    boundary += Math.floor(Math.random() * 10).toString(16);
  }

  this._boundary = boundary;
};

// Note: getLengthSync DOESN'T calculate streams length
// As workaround one can calculate file size manually
// and add it as knownLength option
FormData.prototype.getLengthSync = function() {
  var knownLength = this._overheadLength + this._valueLength;

  // Don't get confused, there are 3 "internal" streams for each keyval pair
  // so it basically checks if there is any value added to the form
  if (this._streams.length) {
    knownLength += this._lastBoundary().length;
  }

  // https://github.com/form-data/form-data/issues/40
  if (!this.hasKnownLength()) {
    // Some async length retrievers are present
    // therefore synchronous length calculation is false.
    // Please use getLength(callback) to get proper length
    this._error(new Error('Cannot calculate proper length in synchronous way.'));
  }

  return knownLength;
};

// Public API to check if length of added values is known
// https://github.com/form-data/form-data/issues/196
// https://github.com/form-data/form-data/issues/262
FormData.prototype.hasKnownLength = function() {
  var hasKnownLength = true;

  if (this._valuesToMeasure.length) {
    hasKnownLength = false;
  }

  return hasKnownLength;
};

FormData.prototype.getLength = function(cb) {
  var knownLength = this._overheadLength + this._valueLength;

  if (this._streams.length) {
    knownLength += this._lastBoundary().length;
  }

  if (!this._valuesToMeasure.length) {
    process.nextTick(cb.bind(this, null, knownLength));
    return;
  }

  asynckit.parallel(this._valuesToMeasure, this._lengthRetriever, function(err, values) {
    if (err) {
      cb(err);
      return;
    }

    values.forEach(function(length) {
      knownLength += length;
    });

    cb(null, knownLength);
  });
};

FormData.prototype.submit = function(params, cb) {
  var request
    , options
    , defaults = {method: 'post'}
    ;

  // parse provided url if it's string
  // or treat it as options object
  if (typeof params == 'string') {

    params = parseUrl(params);
    options = populate({
      port: params.port,
      path: params.pathname,
      host: params.hostname,
      protocol: params.protocol
    }, defaults);

  // use custom params
  } else {

    options = populate(params, defaults);
    // if no port provided use default one
    if (!options.port) {
      options.port = options.protocol == 'https:' ? 443 : 80;
    }
  }

  // put that good code in getHeaders to some use
  options.headers = this.getHeaders(params.headers);

  // https if specified, fallback to http in any other case
  if (options.protocol == 'https:') {
    request = https.request(options);
  } else {
    request = http.request(options);
  }

  // get content length and fire away
  this.getLength(function(err, length) {
    if (err) {
      this._error(err);
      return;
    }

    // add content length
    request.setHeader('Content-Length', length);

    this.pipe(request);
    if (cb) {
      var onResponse;

      var callback = function (error, responce) {
        request.removeListener('error', callback);
        request.removeListener('response', onResponse);

        return cb.call(this, error, responce);
      };

      onResponse = callback.bind(this, null);

      request.on('error', callback);
      request.on('response', onResponse);
    }
  }.bind(this));

  return request;
};

FormData.prototype._error = function(err) {
  if (!this.error) {
    this.error = err;
    this.pause();
    this.emit('error', err);
  }
};

FormData.prototype.toString = function () {
  return '[object FormData]';
};


/***/ }),

/***/ 142:
/***/ ((module) => {

// populates missing values
module.exports = function(dst, src) {

  Object.keys(src).forEach(function(prop)
  {
    dst[prop] = dst[prop] || src[prop];
  });

  return dst;
};


/***/ }),

/***/ 426:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/*!
 * mime-db
 * Copyright(c) 2014 Jonathan Ong
 * MIT Licensed
 */

/**
 * Module exports.
 */

module.exports = __nccwpck_require__(313)


/***/ }),

/***/ 583:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
/*!
 * mime-types
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var db = __nccwpck_require__(426)
var extname = __nccwpck_require__(622).extname

/**
 * Module variables.
 * @private
 */

var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/
var TEXT_TYPE_REGEXP = /^text\//i

/**
 * Module exports.
 * @public
 */

exports.charset = charset
exports.charsets = { lookup: charset }
exports.contentType = contentType
exports.extension = extension
exports.extensions = Object.create(null)
exports.lookup = lookup
exports.types = Object.create(null)

// Populate the extensions/types maps
populateMaps(exports.extensions, exports.types)

/**
 * Get the default charset for a MIME type.
 *
 * @param {string} type
 * @return {boolean|string}
 */

function charset (type) {
  if (!type || typeof type !== 'string') {
    return false
  }

  // TODO: use media-typer
  var match = EXTRACT_TYPE_REGEXP.exec(type)
  var mime = match && db[match[1].toLowerCase()]

  if (mime && mime.charset) {
    return mime.charset
  }

  // default text/* to utf-8
  if (match && TEXT_TYPE_REGEXP.test(match[1])) {
    return 'UTF-8'
  }

  return false
}

/**
 * Create a full Content-Type header given a MIME type or extension.
 *
 * @param {string} str
 * @return {boolean|string}
 */

function contentType (str) {
  // TODO: should this even be in this module?
  if (!str || typeof str !== 'string') {
    return false
  }

  var mime = str.indexOf('/') === -1
    ? exports.lookup(str)
    : str

  if (!mime) {
    return false
  }

  // TODO: use content-type or other module
  if (mime.indexOf('charset') === -1) {
    var charset = exports.charset(mime)
    if (charset) mime += '; charset=' + charset.toLowerCase()
  }

  return mime
}

/**
 * Get the default extension for a MIME type.
 *
 * @param {string} type
 * @return {boolean|string}
 */

function extension (type) {
  if (!type || typeof type !== 'string') {
    return false
  }

  // TODO: use media-typer
  var match = EXTRACT_TYPE_REGEXP.exec(type)

  // get extensions
  var exts = match && exports.extensions[match[1].toLowerCase()]

  if (!exts || !exts.length) {
    return false
  }

  return exts[0]
}

/**
 * Lookup the MIME type for a file path/extension.
 *
 * @param {string} path
 * @return {boolean|string}
 */

function lookup (path) {
  if (!path || typeof path !== 'string') {
    return false
  }

  // get the extension ("ext" or ".ext" or full path)
  var extension = extname('x.' + path)
    .toLowerCase()
    .substr(1)

  if (!extension) {
    return false
  }

  return exports.types[extension] || false
}

/**
 * Populate the extensions and types maps.
 * @private
 */

function populateMaps (extensions, types) {
  // source preference (least -> most)
  var preference = ['nginx', 'apache', undefined, 'iana']

  Object.keys(db).forEach(function forEachMimeType (type) {
    var mime = db[type]
    var exts = mime.extensions

    if (!exts || !exts.length) {
      return
    }

    // mime -> extensions
    extensions[type] = exts

    // extension -> mime
    for (var i = 0; i < exts.length; i++) {
      var extension = exts[i]

      if (types[extension]) {
        var from = preference.indexOf(db[types[extension]].source)
        var to = preference.indexOf(mime.source)

        if (types[extension] !== 'application/octet-stream' &&
          (from > to || (from === to && types[extension].substr(0, 12) === 'application/'))) {
          // skip the remapping
          continue
        }
      }

      // set the extension -> mime
      types[extension] = type
    }
  })
}


/***/ }),

/***/ 172:
/***/ ((module) => {

// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2017 Kris Kowal under the terms of the MIT
 * license found at https://github.com/kriskowal/q/blob/v1/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (true) {
        module.exports = definition();

    // RequireJS
    } else { var previousQ, global; }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];

    function flush() {
        /* jshint loopfunc: true */
        var task, domain;

        while (head.next) {
            head = head.next;
            task = head.task;
            head.task = void 0;
            domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }
            runSingle(task, domain);

        }
        while (laterQueue.length) {
            task = laterQueue.pop();
            runSingle(task);
        }
        flushing = false;
    }
    // runs a single function in the async queue
    function runSingle(task, domain) {
        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process === "object" &&
        process.toString() === "[object process]" && process.nextTick) {
        // Ensure Q is in a real Node environment, with a `process.nextTick`.
        // To see through fake Node environments:
        // * Mocha test runner - exposes a `process` global without a `nextTick`
        // * Browserify - exposes a `process.nexTick` function that uses
        //   `setTimeout`. In this case `setImmediate` is preferred because
        //    it is faster. Browserify's `process.toString()` yields
        //   "[object Object]", while in a real Node environment
        //   `process.toString()` yields "[object process]".
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
        laterQueue.push(task);
        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };
    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_defineProperty = Object.defineProperty || function (obj, prop, descriptor) {
    obj[prop] = descriptor.value;
    return obj;
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack && (!error.__minimumStackCounter__ || error.__minimumStackCounter__ > p.stackCounter)) {
                object_defineProperty(error, "__minimumStackCounter__", {value: p.stackCounter, configurable: true});
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        var stack = filterStackString(concatedStacks);
        object_defineProperty(error, "stack", {value: stack, configurable: true});
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * The counter is used to determine the stopping point for building
 * long stack traces. In makeStackTraceLong we walk backwards through
 * the linked list of promises, only stacks which were created before
 * the rejection are concatenated.
 */
var longStackCounter = 1;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
            promise.stackCounter = longStackCounter++;
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;

        if (Q.longStackSupport && hasStacks) {
            // Only hold a reference to the new promise if long stacks
            // are enabled to reduce memory usage
            promise.source = newPromise;
        }

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Q can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function (resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function (answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var reportedUnhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
            if (array_indexOf(unhandledRejections, promise) !== -1) {
                process.emit("unhandledRejection", reason, promise);
                reportedUnhandledRejections.push(promise);
            }
        });
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        if (typeof process === "object" && typeof process.emit === "function") {
            Q.nextTick.runAfter(function () {
                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                if (atReport !== -1) {
                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                    reportedUnhandledRejections.splice(atReport, 1);
                }
            });
        }
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function (prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected(err) {
            pendingCount--;
            if (pendingCount === 0) {
                var rejection = err || new Error("" + err);

                rejection.message = ("Q can't get fulfillment value from any promise, all " +
                    "promises were rejected. Last error message: " + rejection.message);

                deferred.reject(rejection);
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function () {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    if (!callback || typeof callback.apply !== "function") {
        throw new Error("Q can't apply finally callback");
    }
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    if (callback === undefined) {
        throw new Error("Q can't wrap an undefined function");
    }
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

Q.noConflict = function() {
    throw new Error("Q.noConflict only works when Q is used as a global");
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});


/***/ }),

/***/ 313:
/***/ ((module) => {

"use strict";
module.exports = JSON.parse("{\"application/1d-interleaved-parityfec\":{\"source\":\"iana\"},\"application/3gpdash-qoe-report+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/3gpp-ims+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/a2l\":{\"source\":\"iana\"},\"application/activemessage\":{\"source\":\"iana\"},\"application/activity+json\":{\"source\":\"iana\",\"compressible\":true},\"application/alto-costmap+json\":{\"source\":\"iana\",\"compressible\":true},\"application/alto-costmapfilter+json\":{\"source\":\"iana\",\"compressible\":true},\"application/alto-directory+json\":{\"source\":\"iana\",\"compressible\":true},\"application/alto-endpointcost+json\":{\"source\":\"iana\",\"compressible\":true},\"application/alto-endpointcostparams+json\":{\"source\":\"iana\",\"compressible\":true},\"application/alto-endpointprop+json\":{\"source\":\"iana\",\"compressible\":true},\"application/alto-endpointpropparams+json\":{\"source\":\"iana\",\"compressible\":true},\"application/alto-error+json\":{\"source\":\"iana\",\"compressible\":true},\"application/alto-networkmap+json\":{\"source\":\"iana\",\"compressible\":true},\"application/alto-networkmapfilter+json\":{\"source\":\"iana\",\"compressible\":true},\"application/aml\":{\"source\":\"iana\"},\"application/andrew-inset\":{\"source\":\"iana\",\"extensions\":[\"ez\"]},\"application/applefile\":{\"source\":\"iana\"},\"application/applixware\":{\"source\":\"apache\",\"extensions\":[\"aw\"]},\"application/atf\":{\"source\":\"iana\"},\"application/atfx\":{\"source\":\"iana\"},\"application/atom+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"atom\"]},\"application/atomcat+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"atomcat\"]},\"application/atomdeleted+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/atomicmail\":{\"source\":\"iana\"},\"application/atomsvc+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"atomsvc\"]},\"application/atsc-dwd+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/atsc-held+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/atsc-rsat+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/atxml\":{\"source\":\"iana\"},\"application/auth-policy+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/bacnet-xdd+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/batch-smtp\":{\"source\":\"iana\"},\"application/bdoc\":{\"compressible\":false,\"extensions\":[\"bdoc\"]},\"application/beep+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/calendar+json\":{\"source\":\"iana\",\"compressible\":true},\"application/calendar+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/call-completion\":{\"source\":\"iana\"},\"application/cals-1840\":{\"source\":\"iana\"},\"application/cbor\":{\"source\":\"iana\"},\"application/cccex\":{\"source\":\"iana\"},\"application/ccmp+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/ccxml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"ccxml\"]},\"application/cdfx+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/cdmi-capability\":{\"source\":\"iana\",\"extensions\":[\"cdmia\"]},\"application/cdmi-container\":{\"source\":\"iana\",\"extensions\":[\"cdmic\"]},\"application/cdmi-domain\":{\"source\":\"iana\",\"extensions\":[\"cdmid\"]},\"application/cdmi-object\":{\"source\":\"iana\",\"extensions\":[\"cdmio\"]},\"application/cdmi-queue\":{\"source\":\"iana\",\"extensions\":[\"cdmiq\"]},\"application/cdni\":{\"source\":\"iana\"},\"application/cea\":{\"source\":\"iana\"},\"application/cea-2018+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/cellml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/cfw\":{\"source\":\"iana\"},\"application/clue_info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/cms\":{\"source\":\"iana\"},\"application/cnrp+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/coap-group+json\":{\"source\":\"iana\",\"compressible\":true},\"application/coap-payload\":{\"source\":\"iana\"},\"application/commonground\":{\"source\":\"iana\"},\"application/conference-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/cose\":{\"source\":\"iana\"},\"application/cose-key\":{\"source\":\"iana\"},\"application/cose-key-set\":{\"source\":\"iana\"},\"application/cpl+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/csrattrs\":{\"source\":\"iana\"},\"application/csta+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/cstadata+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/csvm+json\":{\"source\":\"iana\",\"compressible\":true},\"application/cu-seeme\":{\"source\":\"apache\",\"extensions\":[\"cu\"]},\"application/cwt\":{\"source\":\"iana\"},\"application/cybercash\":{\"source\":\"iana\"},\"application/dart\":{\"compressible\":true},\"application/dash+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"mpd\"]},\"application/dashdelta\":{\"source\":\"iana\"},\"application/davmount+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"davmount\"]},\"application/dca-rft\":{\"source\":\"iana\"},\"application/dcd\":{\"source\":\"iana\"},\"application/dec-dx\":{\"source\":\"iana\"},\"application/dialog-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/dicom\":{\"source\":\"iana\"},\"application/dicom+json\":{\"source\":\"iana\",\"compressible\":true},\"application/dicom+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/dii\":{\"source\":\"iana\"},\"application/dit\":{\"source\":\"iana\"},\"application/dns\":{\"source\":\"iana\"},\"application/dns+json\":{\"source\":\"iana\",\"compressible\":true},\"application/dns-message\":{\"source\":\"iana\"},\"application/docbook+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"dbk\"]},\"application/dskpp+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/dssc+der\":{\"source\":\"iana\",\"extensions\":[\"dssc\"]},\"application/dssc+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xdssc\"]},\"application/dvcs\":{\"source\":\"iana\"},\"application/ecmascript\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"ecma\",\"es\"]},\"application/edi-consent\":{\"source\":\"iana\"},\"application/edi-x12\":{\"source\":\"iana\",\"compressible\":false},\"application/edifact\":{\"source\":\"iana\",\"compressible\":false},\"application/efi\":{\"source\":\"iana\"},\"application/emergencycalldata.comment+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/emergencycalldata.control+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/emergencycalldata.deviceinfo+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/emergencycalldata.ecall.msd\":{\"source\":\"iana\"},\"application/emergencycalldata.providerinfo+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/emergencycalldata.serviceinfo+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/emergencycalldata.subscriberinfo+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/emergencycalldata.veds+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/emma+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"emma\"]},\"application/emotionml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/encaprtp\":{\"source\":\"iana\"},\"application/epp+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/epub+zip\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"epub\"]},\"application/eshop\":{\"source\":\"iana\"},\"application/exi\":{\"source\":\"iana\",\"extensions\":[\"exi\"]},\"application/expect-ct-report+json\":{\"source\":\"iana\",\"compressible\":true},\"application/fastinfoset\":{\"source\":\"iana\"},\"application/fastsoap\":{\"source\":\"iana\"},\"application/fdt+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/fhir+json\":{\"source\":\"iana\",\"compressible\":true},\"application/fhir+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/fido.trusted-apps+json\":{\"compressible\":true},\"application/fits\":{\"source\":\"iana\"},\"application/flexfec\":{\"source\":\"iana\"},\"application/font-sfnt\":{\"source\":\"iana\"},\"application/font-tdpfr\":{\"source\":\"iana\",\"extensions\":[\"pfr\"]},\"application/font-woff\":{\"source\":\"iana\",\"compressible\":false},\"application/framework-attributes+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/geo+json\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"geojson\"]},\"application/geo+json-seq\":{\"source\":\"iana\"},\"application/geopackage+sqlite3\":{\"source\":\"iana\"},\"application/geoxacml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/gltf-buffer\":{\"source\":\"iana\"},\"application/gml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"gml\"]},\"application/gpx+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"gpx\"]},\"application/gxf\":{\"source\":\"apache\",\"extensions\":[\"gxf\"]},\"application/gzip\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"gz\"]},\"application/h224\":{\"source\":\"iana\"},\"application/held+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/hjson\":{\"extensions\":[\"hjson\"]},\"application/http\":{\"source\":\"iana\"},\"application/hyperstudio\":{\"source\":\"iana\",\"extensions\":[\"stk\"]},\"application/ibe-key-request+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/ibe-pkg-reply+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/ibe-pp-data\":{\"source\":\"iana\"},\"application/iges\":{\"source\":\"iana\"},\"application/im-iscomposing+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/index\":{\"source\":\"iana\"},\"application/index.cmd\":{\"source\":\"iana\"},\"application/index.obj\":{\"source\":\"iana\"},\"application/index.response\":{\"source\":\"iana\"},\"application/index.vnd\":{\"source\":\"iana\"},\"application/inkml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"ink\",\"inkml\"]},\"application/iotp\":{\"source\":\"iana\"},\"application/ipfix\":{\"source\":\"iana\",\"extensions\":[\"ipfix\"]},\"application/ipp\":{\"source\":\"iana\"},\"application/isup\":{\"source\":\"iana\"},\"application/its+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/java-archive\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"jar\",\"war\",\"ear\"]},\"application/java-serialized-object\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"ser\"]},\"application/java-vm\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"class\"]},\"application/javascript\":{\"source\":\"iana\",\"charset\":\"UTF-8\",\"compressible\":true,\"extensions\":[\"js\",\"mjs\"]},\"application/jf2feed+json\":{\"source\":\"iana\",\"compressible\":true},\"application/jose\":{\"source\":\"iana\"},\"application/jose+json\":{\"source\":\"iana\",\"compressible\":true},\"application/jrd+json\":{\"source\":\"iana\",\"compressible\":true},\"application/json\":{\"source\":\"iana\",\"charset\":\"UTF-8\",\"compressible\":true,\"extensions\":[\"json\",\"map\"]},\"application/json-patch+json\":{\"source\":\"iana\",\"compressible\":true},\"application/json-seq\":{\"source\":\"iana\"},\"application/json5\":{\"extensions\":[\"json5\"]},\"application/jsonml+json\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"jsonml\"]},\"application/jwk+json\":{\"source\":\"iana\",\"compressible\":true},\"application/jwk-set+json\":{\"source\":\"iana\",\"compressible\":true},\"application/jwt\":{\"source\":\"iana\"},\"application/kpml-request+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/kpml-response+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/ld+json\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"jsonld\"]},\"application/lgr+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/link-format\":{\"source\":\"iana\"},\"application/load-control+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/lost+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"lostxml\"]},\"application/lostsync+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/lxf\":{\"source\":\"iana\"},\"application/mac-binhex40\":{\"source\":\"iana\",\"extensions\":[\"hqx\"]},\"application/mac-compactpro\":{\"source\":\"apache\",\"extensions\":[\"cpt\"]},\"application/macwriteii\":{\"source\":\"iana\"},\"application/mads+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"mads\"]},\"application/manifest+json\":{\"charset\":\"UTF-8\",\"compressible\":true,\"extensions\":[\"webmanifest\"]},\"application/marc\":{\"source\":\"iana\",\"extensions\":[\"mrc\"]},\"application/marcxml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"mrcx\"]},\"application/mathematica\":{\"source\":\"iana\",\"extensions\":[\"ma\",\"nb\",\"mb\"]},\"application/mathml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"mathml\"]},\"application/mathml-content+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mathml-presentation+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-associated-procedure-description+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-deregister+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-envelope+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-msk+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-msk-response+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-protection-description+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-reception-report+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-register+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-register-response+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-schedule+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbms-user-service-description+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mbox\":{\"source\":\"iana\",\"extensions\":[\"mbox\"]},\"application/media-policy-dataset+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/media_control+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mediaservercontrol+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"mscml\"]},\"application/merge-patch+json\":{\"source\":\"iana\",\"compressible\":true},\"application/metalink+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"metalink\"]},\"application/metalink4+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"meta4\"]},\"application/mets+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"mets\"]},\"application/mf4\":{\"source\":\"iana\"},\"application/mikey\":{\"source\":\"iana\"},\"application/mipc\":{\"source\":\"iana\"},\"application/mmt-aei+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mmt-usd+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mods+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"mods\"]},\"application/moss-keys\":{\"source\":\"iana\"},\"application/moss-signature\":{\"source\":\"iana\"},\"application/mosskey-data\":{\"source\":\"iana\"},\"application/mosskey-request\":{\"source\":\"iana\"},\"application/mp21\":{\"source\":\"iana\",\"extensions\":[\"m21\",\"mp21\"]},\"application/mp4\":{\"source\":\"iana\",\"extensions\":[\"mp4s\",\"m4p\"]},\"application/mpeg4-generic\":{\"source\":\"iana\"},\"application/mpeg4-iod\":{\"source\":\"iana\"},\"application/mpeg4-iod-xmt\":{\"source\":\"iana\"},\"application/mrb-consumer+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/mrb-publish+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/msc-ivr+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/msc-mixer+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/msword\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"doc\",\"dot\"]},\"application/mud+json\":{\"source\":\"iana\",\"compressible\":true},\"application/mxf\":{\"source\":\"iana\",\"extensions\":[\"mxf\"]},\"application/n-quads\":{\"source\":\"iana\",\"extensions\":[\"nq\"]},\"application/n-triples\":{\"source\":\"iana\",\"extensions\":[\"nt\"]},\"application/nasdata\":{\"source\":\"iana\"},\"application/news-checkgroups\":{\"source\":\"iana\"},\"application/news-groupinfo\":{\"source\":\"iana\"},\"application/news-transmission\":{\"source\":\"iana\"},\"application/nlsml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/node\":{\"source\":\"iana\"},\"application/nss\":{\"source\":\"iana\"},\"application/ocsp-request\":{\"source\":\"iana\"},\"application/ocsp-response\":{\"source\":\"iana\"},\"application/octet-stream\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"bin\",\"dms\",\"lrf\",\"mar\",\"so\",\"dist\",\"distz\",\"pkg\",\"bpk\",\"dump\",\"elc\",\"deploy\",\"exe\",\"dll\",\"deb\",\"dmg\",\"iso\",\"img\",\"msi\",\"msp\",\"msm\",\"buffer\"]},\"application/oda\":{\"source\":\"iana\",\"extensions\":[\"oda\"]},\"application/odm+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/odx\":{\"source\":\"iana\"},\"application/oebps-package+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"opf\"]},\"application/ogg\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"ogx\"]},\"application/omdoc+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"omdoc\"]},\"application/onenote\":{\"source\":\"apache\",\"extensions\":[\"onetoc\",\"onetoc2\",\"onetmp\",\"onepkg\"]},\"application/oscore\":{\"source\":\"iana\"},\"application/oxps\":{\"source\":\"iana\",\"extensions\":[\"oxps\"]},\"application/p2p-overlay+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/parityfec\":{\"source\":\"iana\"},\"application/passport\":{\"source\":\"iana\"},\"application/patch-ops-error+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xer\"]},\"application/pdf\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"pdf\"]},\"application/pdx\":{\"source\":\"iana\"},\"application/pem-certificate-chain\":{\"source\":\"iana\"},\"application/pgp-encrypted\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"pgp\"]},\"application/pgp-keys\":{\"source\":\"iana\"},\"application/pgp-signature\":{\"source\":\"iana\",\"extensions\":[\"asc\",\"sig\"]},\"application/pics-rules\":{\"source\":\"apache\",\"extensions\":[\"prf\"]},\"application/pidf+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/pidf-diff+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/pkcs10\":{\"source\":\"iana\",\"extensions\":[\"p10\"]},\"application/pkcs12\":{\"source\":\"iana\"},\"application/pkcs7-mime\":{\"source\":\"iana\",\"extensions\":[\"p7m\",\"p7c\"]},\"application/pkcs7-signature\":{\"source\":\"iana\",\"extensions\":[\"p7s\"]},\"application/pkcs8\":{\"source\":\"iana\",\"extensions\":[\"p8\"]},\"application/pkcs8-encrypted\":{\"source\":\"iana\"},\"application/pkix-attr-cert\":{\"source\":\"iana\",\"extensions\":[\"ac\"]},\"application/pkix-cert\":{\"source\":\"iana\",\"extensions\":[\"cer\"]},\"application/pkix-crl\":{\"source\":\"iana\",\"extensions\":[\"crl\"]},\"application/pkix-pkipath\":{\"source\":\"iana\",\"extensions\":[\"pkipath\"]},\"application/pkixcmp\":{\"source\":\"iana\",\"extensions\":[\"pki\"]},\"application/pls+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"pls\"]},\"application/poc-settings+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/postscript\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"ai\",\"eps\",\"ps\"]},\"application/ppsp-tracker+json\":{\"source\":\"iana\",\"compressible\":true},\"application/problem+json\":{\"source\":\"iana\",\"compressible\":true},\"application/problem+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/provenance+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/prs.alvestrand.titrax-sheet\":{\"source\":\"iana\"},\"application/prs.cww\":{\"source\":\"iana\",\"extensions\":[\"cww\"]},\"application/prs.hpub+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/prs.nprend\":{\"source\":\"iana\"},\"application/prs.plucker\":{\"source\":\"iana\"},\"application/prs.rdf-xml-crypt\":{\"source\":\"iana\"},\"application/prs.xsf+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/pskc+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"pskcxml\"]},\"application/qsig\":{\"source\":\"iana\"},\"application/raml+yaml\":{\"compressible\":true,\"extensions\":[\"raml\"]},\"application/raptorfec\":{\"source\":\"iana\"},\"application/rdap+json\":{\"source\":\"iana\",\"compressible\":true},\"application/rdf+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"rdf\",\"owl\"]},\"application/reginfo+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"rif\"]},\"application/relax-ng-compact-syntax\":{\"source\":\"iana\",\"extensions\":[\"rnc\"]},\"application/remote-printing\":{\"source\":\"iana\"},\"application/reputon+json\":{\"source\":\"iana\",\"compressible\":true},\"application/resource-lists+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"rl\"]},\"application/resource-lists-diff+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"rld\"]},\"application/rfc+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/riscos\":{\"source\":\"iana\"},\"application/rlmi+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/rls-services+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"rs\"]},\"application/route-apd+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/route-s-tsid+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/route-usd+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/rpki-ghostbusters\":{\"source\":\"iana\",\"extensions\":[\"gbr\"]},\"application/rpki-manifest\":{\"source\":\"iana\",\"extensions\":[\"mft\"]},\"application/rpki-publication\":{\"source\":\"iana\"},\"application/rpki-roa\":{\"source\":\"iana\",\"extensions\":[\"roa\"]},\"application/rpki-updown\":{\"source\":\"iana\"},\"application/rsd+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"rsd\"]},\"application/rss+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"rss\"]},\"application/rtf\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"rtf\"]},\"application/rtploopback\":{\"source\":\"iana\"},\"application/rtx\":{\"source\":\"iana\"},\"application/samlassertion+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/samlmetadata+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/sbml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"sbml\"]},\"application/scaip+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/scim+json\":{\"source\":\"iana\",\"compressible\":true},\"application/scvp-cv-request\":{\"source\":\"iana\",\"extensions\":[\"scq\"]},\"application/scvp-cv-response\":{\"source\":\"iana\",\"extensions\":[\"scs\"]},\"application/scvp-vp-request\":{\"source\":\"iana\",\"extensions\":[\"spq\"]},\"application/scvp-vp-response\":{\"source\":\"iana\",\"extensions\":[\"spp\"]},\"application/sdp\":{\"source\":\"iana\",\"extensions\":[\"sdp\"]},\"application/secevent+jwt\":{\"source\":\"iana\"},\"application/senml+cbor\":{\"source\":\"iana\"},\"application/senml+json\":{\"source\":\"iana\",\"compressible\":true},\"application/senml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/senml-exi\":{\"source\":\"iana\"},\"application/sensml+cbor\":{\"source\":\"iana\"},\"application/sensml+json\":{\"source\":\"iana\",\"compressible\":true},\"application/sensml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/sensml-exi\":{\"source\":\"iana\"},\"application/sep+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/sep-exi\":{\"source\":\"iana\"},\"application/session-info\":{\"source\":\"iana\"},\"application/set-payment\":{\"source\":\"iana\"},\"application/set-payment-initiation\":{\"source\":\"iana\",\"extensions\":[\"setpay\"]},\"application/set-registration\":{\"source\":\"iana\"},\"application/set-registration-initiation\":{\"source\":\"iana\",\"extensions\":[\"setreg\"]},\"application/sgml\":{\"source\":\"iana\"},\"application/sgml-open-catalog\":{\"source\":\"iana\"},\"application/shf+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"shf\"]},\"application/sieve\":{\"source\":\"iana\",\"extensions\":[\"siv\",\"sieve\"]},\"application/simple-filter+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/simple-message-summary\":{\"source\":\"iana\"},\"application/simplesymbolcontainer\":{\"source\":\"iana\"},\"application/sipc\":{\"source\":\"iana\"},\"application/slate\":{\"source\":\"iana\"},\"application/smil\":{\"source\":\"iana\"},\"application/smil+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"smi\",\"smil\"]},\"application/smpte336m\":{\"source\":\"iana\"},\"application/soap+fastinfoset\":{\"source\":\"iana\"},\"application/soap+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/sparql-query\":{\"source\":\"iana\",\"extensions\":[\"rq\"]},\"application/sparql-results+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"srx\"]},\"application/spirits-event+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/sql\":{\"source\":\"iana\"},\"application/srgs\":{\"source\":\"iana\",\"extensions\":[\"gram\"]},\"application/srgs+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"grxml\"]},\"application/sru+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"sru\"]},\"application/ssdl+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"ssdl\"]},\"application/ssml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"ssml\"]},\"application/stix+json\":{\"source\":\"iana\",\"compressible\":true},\"application/swid+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/tamp-apex-update\":{\"source\":\"iana\"},\"application/tamp-apex-update-confirm\":{\"source\":\"iana\"},\"application/tamp-community-update\":{\"source\":\"iana\"},\"application/tamp-community-update-confirm\":{\"source\":\"iana\"},\"application/tamp-error\":{\"source\":\"iana\"},\"application/tamp-sequence-adjust\":{\"source\":\"iana\"},\"application/tamp-sequence-adjust-confirm\":{\"source\":\"iana\"},\"application/tamp-status-query\":{\"source\":\"iana\"},\"application/tamp-status-response\":{\"source\":\"iana\"},\"application/tamp-update\":{\"source\":\"iana\"},\"application/tamp-update-confirm\":{\"source\":\"iana\"},\"application/tar\":{\"compressible\":true},\"application/taxii+json\":{\"source\":\"iana\",\"compressible\":true},\"application/tei+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"tei\",\"teicorpus\"]},\"application/tetra_isi\":{\"source\":\"iana\"},\"application/thraud+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"tfi\"]},\"application/timestamp-query\":{\"source\":\"iana\"},\"application/timestamp-reply\":{\"source\":\"iana\"},\"application/timestamped-data\":{\"source\":\"iana\",\"extensions\":[\"tsd\"]},\"application/tlsrpt+gzip\":{\"source\":\"iana\"},\"application/tlsrpt+json\":{\"source\":\"iana\",\"compressible\":true},\"application/tnauthlist\":{\"source\":\"iana\"},\"application/toml\":{\"compressible\":true,\"extensions\":[\"toml\"]},\"application/trickle-ice-sdpfrag\":{\"source\":\"iana\"},\"application/trig\":{\"source\":\"iana\"},\"application/ttml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/tve-trigger\":{\"source\":\"iana\"},\"application/tzif\":{\"source\":\"iana\"},\"application/tzif-leap\":{\"source\":\"iana\"},\"application/ulpfec\":{\"source\":\"iana\"},\"application/urc-grpsheet+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/urc-ressheet+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/urc-targetdesc+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/urc-uisocketdesc+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vcard+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vcard+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vemmi\":{\"source\":\"iana\"},\"application/vividence.scriptfile\":{\"source\":\"apache\"},\"application/vnd.1000minds.decision-model+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp-prose+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp-prose-pc3ch+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp-v2x-local-service-information\":{\"source\":\"iana\"},\"application/vnd.3gpp.access-transfer-events+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.bsf+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.gmop+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mc-signalling-ear\":{\"source\":\"iana\"},\"application/vnd.3gpp.mcdata-affiliation-command+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcdata-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcdata-payload\":{\"source\":\"iana\"},\"application/vnd.3gpp.mcdata-service-config+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcdata-signalling\":{\"source\":\"iana\"},\"application/vnd.3gpp.mcdata-ue-config+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcdata-user-profile+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcptt-affiliation-command+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcptt-floor-request+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcptt-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcptt-location-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcptt-mbms-usage-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcptt-service-config+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcptt-signed+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcptt-ue-config+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcptt-ue-init-config+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcptt-user-profile+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcvideo-affiliation-command+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcvideo-affiliation-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcvideo-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcvideo-location-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcvideo-mbms-usage-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcvideo-service-config+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcvideo-transmission-request+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcvideo-ue-config+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mcvideo-user-profile+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.mid-call+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.pic-bw-large\":{\"source\":\"iana\",\"extensions\":[\"plb\"]},\"application/vnd.3gpp.pic-bw-small\":{\"source\":\"iana\",\"extensions\":[\"psb\"]},\"application/vnd.3gpp.pic-bw-var\":{\"source\":\"iana\",\"extensions\":[\"pvb\"]},\"application/vnd.3gpp.sms\":{\"source\":\"iana\"},\"application/vnd.3gpp.sms+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.srvcc-ext+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.srvcc-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.state-and-event-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp.ussd+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp2.bcmcsinfo+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.3gpp2.sms\":{\"source\":\"iana\"},\"application/vnd.3gpp2.tcap\":{\"source\":\"iana\",\"extensions\":[\"tcap\"]},\"application/vnd.3lightssoftware.imagescal\":{\"source\":\"iana\"},\"application/vnd.3m.post-it-notes\":{\"source\":\"iana\",\"extensions\":[\"pwn\"]},\"application/vnd.accpac.simply.aso\":{\"source\":\"iana\",\"extensions\":[\"aso\"]},\"application/vnd.accpac.simply.imp\":{\"source\":\"iana\",\"extensions\":[\"imp\"]},\"application/vnd.acucobol\":{\"source\":\"iana\",\"extensions\":[\"acu\"]},\"application/vnd.acucorp\":{\"source\":\"iana\",\"extensions\":[\"atc\",\"acutc\"]},\"application/vnd.adobe.air-application-installer-package+zip\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"air\"]},\"application/vnd.adobe.flash.movie\":{\"source\":\"iana\"},\"application/vnd.adobe.formscentral.fcdt\":{\"source\":\"iana\",\"extensions\":[\"fcdt\"]},\"application/vnd.adobe.fxp\":{\"source\":\"iana\",\"extensions\":[\"fxp\",\"fxpl\"]},\"application/vnd.adobe.partial-upload\":{\"source\":\"iana\"},\"application/vnd.adobe.xdp+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xdp\"]},\"application/vnd.adobe.xfdf\":{\"source\":\"iana\",\"extensions\":[\"xfdf\"]},\"application/vnd.aether.imp\":{\"source\":\"iana\"},\"application/vnd.afpc.afplinedata\":{\"source\":\"iana\"},\"application/vnd.afpc.modca\":{\"source\":\"iana\"},\"application/vnd.ah-barcode\":{\"source\":\"iana\"},\"application/vnd.ahead.space\":{\"source\":\"iana\",\"extensions\":[\"ahead\"]},\"application/vnd.airzip.filesecure.azf\":{\"source\":\"iana\",\"extensions\":[\"azf\"]},\"application/vnd.airzip.filesecure.azs\":{\"source\":\"iana\",\"extensions\":[\"azs\"]},\"application/vnd.amadeus+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.amazon.ebook\":{\"source\":\"apache\",\"extensions\":[\"azw\"]},\"application/vnd.amazon.mobi8-ebook\":{\"source\":\"iana\"},\"application/vnd.americandynamics.acc\":{\"source\":\"iana\",\"extensions\":[\"acc\"]},\"application/vnd.amiga.ami\":{\"source\":\"iana\",\"extensions\":[\"ami\"]},\"application/vnd.amundsen.maze+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.android.ota\":{\"source\":\"iana\"},\"application/vnd.android.package-archive\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"apk\"]},\"application/vnd.anki\":{\"source\":\"iana\"},\"application/vnd.anser-web-certificate-issue-initiation\":{\"source\":\"iana\",\"extensions\":[\"cii\"]},\"application/vnd.anser-web-funds-transfer-initiation\":{\"source\":\"apache\",\"extensions\":[\"fti\"]},\"application/vnd.antix.game-component\":{\"source\":\"iana\",\"extensions\":[\"atx\"]},\"application/vnd.apache.thrift.binary\":{\"source\":\"iana\"},\"application/vnd.apache.thrift.compact\":{\"source\":\"iana\"},\"application/vnd.apache.thrift.json\":{\"source\":\"iana\"},\"application/vnd.api+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.apothekende.reservation+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.apple.installer+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"mpkg\"]},\"application/vnd.apple.keynote\":{\"source\":\"iana\",\"extensions\":[\"keynote\"]},\"application/vnd.apple.mpegurl\":{\"source\":\"iana\",\"extensions\":[\"m3u8\"]},\"application/vnd.apple.numbers\":{\"source\":\"iana\",\"extensions\":[\"numbers\"]},\"application/vnd.apple.pages\":{\"source\":\"iana\",\"extensions\":[\"pages\"]},\"application/vnd.apple.pkpass\":{\"compressible\":false,\"extensions\":[\"pkpass\"]},\"application/vnd.arastra.swi\":{\"source\":\"iana\"},\"application/vnd.aristanetworks.swi\":{\"source\":\"iana\",\"extensions\":[\"swi\"]},\"application/vnd.artisan+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.artsquare\":{\"source\":\"iana\"},\"application/vnd.astraea-software.iota\":{\"source\":\"iana\",\"extensions\":[\"iota\"]},\"application/vnd.audiograph\":{\"source\":\"iana\",\"extensions\":[\"aep\"]},\"application/vnd.autopackage\":{\"source\":\"iana\"},\"application/vnd.avalon+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.avistar+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.balsamiq.bmml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.balsamiq.bmpr\":{\"source\":\"iana\"},\"application/vnd.banana-accounting\":{\"source\":\"iana\"},\"application/vnd.bbf.usp.error\":{\"source\":\"iana\"},\"application/vnd.bbf.usp.msg\":{\"source\":\"iana\"},\"application/vnd.bbf.usp.msg+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.bekitzur-stech+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.bint.med-content\":{\"source\":\"iana\"},\"application/vnd.biopax.rdf+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.blink-idb-value-wrapper\":{\"source\":\"iana\"},\"application/vnd.blueice.multipass\":{\"source\":\"iana\",\"extensions\":[\"mpm\"]},\"application/vnd.bluetooth.ep.oob\":{\"source\":\"iana\"},\"application/vnd.bluetooth.le.oob\":{\"source\":\"iana\"},\"application/vnd.bmi\":{\"source\":\"iana\",\"extensions\":[\"bmi\"]},\"application/vnd.bpf\":{\"source\":\"iana\"},\"application/vnd.bpf3\":{\"source\":\"iana\"},\"application/vnd.businessobjects\":{\"source\":\"iana\",\"extensions\":[\"rep\"]},\"application/vnd.byu.uapi+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.cab-jscript\":{\"source\":\"iana\"},\"application/vnd.canon-cpdl\":{\"source\":\"iana\"},\"application/vnd.canon-lips\":{\"source\":\"iana\"},\"application/vnd.capasystems-pg+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.cendio.thinlinc.clientconf\":{\"source\":\"iana\"},\"application/vnd.century-systems.tcp_stream\":{\"source\":\"iana\"},\"application/vnd.chemdraw+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"cdxml\"]},\"application/vnd.chess-pgn\":{\"source\":\"iana\"},\"application/vnd.chipnuts.karaoke-mmd\":{\"source\":\"iana\",\"extensions\":[\"mmd\"]},\"application/vnd.ciedi\":{\"source\":\"iana\"},\"application/vnd.cinderella\":{\"source\":\"iana\",\"extensions\":[\"cdy\"]},\"application/vnd.cirpack.isdn-ext\":{\"source\":\"iana\"},\"application/vnd.citationstyles.style+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"csl\"]},\"application/vnd.claymore\":{\"source\":\"iana\",\"extensions\":[\"cla\"]},\"application/vnd.cloanto.rp9\":{\"source\":\"iana\",\"extensions\":[\"rp9\"]},\"application/vnd.clonk.c4group\":{\"source\":\"iana\",\"extensions\":[\"c4g\",\"c4d\",\"c4f\",\"c4p\",\"c4u\"]},\"application/vnd.cluetrust.cartomobile-config\":{\"source\":\"iana\",\"extensions\":[\"c11amc\"]},\"application/vnd.cluetrust.cartomobile-config-pkg\":{\"source\":\"iana\",\"extensions\":[\"c11amz\"]},\"application/vnd.coffeescript\":{\"source\":\"iana\"},\"application/vnd.collabio.xodocuments.document\":{\"source\":\"iana\"},\"application/vnd.collabio.xodocuments.document-template\":{\"source\":\"iana\"},\"application/vnd.collabio.xodocuments.presentation\":{\"source\":\"iana\"},\"application/vnd.collabio.xodocuments.presentation-template\":{\"source\":\"iana\"},\"application/vnd.collabio.xodocuments.spreadsheet\":{\"source\":\"iana\"},\"application/vnd.collabio.xodocuments.spreadsheet-template\":{\"source\":\"iana\"},\"application/vnd.collection+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.collection.doc+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.collection.next+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.comicbook+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.comicbook-rar\":{\"source\":\"iana\"},\"application/vnd.commerce-battelle\":{\"source\":\"iana\"},\"application/vnd.commonspace\":{\"source\":\"iana\",\"extensions\":[\"csp\"]},\"application/vnd.contact.cmsg\":{\"source\":\"iana\",\"extensions\":[\"cdbcmsg\"]},\"application/vnd.coreos.ignition+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.cosmocaller\":{\"source\":\"iana\",\"extensions\":[\"cmc\"]},\"application/vnd.crick.clicker\":{\"source\":\"iana\",\"extensions\":[\"clkx\"]},\"application/vnd.crick.clicker.keyboard\":{\"source\":\"iana\",\"extensions\":[\"clkk\"]},\"application/vnd.crick.clicker.palette\":{\"source\":\"iana\",\"extensions\":[\"clkp\"]},\"application/vnd.crick.clicker.template\":{\"source\":\"iana\",\"extensions\":[\"clkt\"]},\"application/vnd.crick.clicker.wordbank\":{\"source\":\"iana\",\"extensions\":[\"clkw\"]},\"application/vnd.criticaltools.wbs+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"wbs\"]},\"application/vnd.cryptii.pipe+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.crypto-shade-file\":{\"source\":\"iana\"},\"application/vnd.ctc-posml\":{\"source\":\"iana\",\"extensions\":[\"pml\"]},\"application/vnd.ctct.ws+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.cups-pdf\":{\"source\":\"iana\"},\"application/vnd.cups-postscript\":{\"source\":\"iana\"},\"application/vnd.cups-ppd\":{\"source\":\"iana\",\"extensions\":[\"ppd\"]},\"application/vnd.cups-raster\":{\"source\":\"iana\"},\"application/vnd.cups-raw\":{\"source\":\"iana\"},\"application/vnd.curl\":{\"source\":\"iana\"},\"application/vnd.curl.car\":{\"source\":\"apache\",\"extensions\":[\"car\"]},\"application/vnd.curl.pcurl\":{\"source\":\"apache\",\"extensions\":[\"pcurl\"]},\"application/vnd.cyan.dean.root+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.cybank\":{\"source\":\"iana\"},\"application/vnd.d2l.coursepackage1p0+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.dart\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"dart\"]},\"application/vnd.data-vision.rdz\":{\"source\":\"iana\",\"extensions\":[\"rdz\"]},\"application/vnd.datapackage+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.dataresource+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.debian.binary-package\":{\"source\":\"iana\"},\"application/vnd.dece.data\":{\"source\":\"iana\",\"extensions\":[\"uvf\",\"uvvf\",\"uvd\",\"uvvd\"]},\"application/vnd.dece.ttml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"uvt\",\"uvvt\"]},\"application/vnd.dece.unspecified\":{\"source\":\"iana\",\"extensions\":[\"uvx\",\"uvvx\"]},\"application/vnd.dece.zip\":{\"source\":\"iana\",\"extensions\":[\"uvz\",\"uvvz\"]},\"application/vnd.denovo.fcselayout-link\":{\"source\":\"iana\",\"extensions\":[\"fe_launch\"]},\"application/vnd.desmume.movie\":{\"source\":\"iana\"},\"application/vnd.dir-bi.plate-dl-nosuffix\":{\"source\":\"iana\"},\"application/vnd.dm.delegation+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.dna\":{\"source\":\"iana\",\"extensions\":[\"dna\"]},\"application/vnd.document+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.dolby.mlp\":{\"source\":\"apache\",\"extensions\":[\"mlp\"]},\"application/vnd.dolby.mobile.1\":{\"source\":\"iana\"},\"application/vnd.dolby.mobile.2\":{\"source\":\"iana\"},\"application/vnd.doremir.scorecloud-binary-document\":{\"source\":\"iana\"},\"application/vnd.dpgraph\":{\"source\":\"iana\",\"extensions\":[\"dpg\"]},\"application/vnd.dreamfactory\":{\"source\":\"iana\",\"extensions\":[\"dfac\"]},\"application/vnd.drive+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ds-keypoint\":{\"source\":\"apache\",\"extensions\":[\"kpxx\"]},\"application/vnd.dtg.local\":{\"source\":\"iana\"},\"application/vnd.dtg.local.flash\":{\"source\":\"iana\"},\"application/vnd.dtg.local.html\":{\"source\":\"iana\"},\"application/vnd.dvb.ait\":{\"source\":\"iana\",\"extensions\":[\"ait\"]},\"application/vnd.dvb.dvbj\":{\"source\":\"iana\"},\"application/vnd.dvb.esgcontainer\":{\"source\":\"iana\"},\"application/vnd.dvb.ipdcdftnotifaccess\":{\"source\":\"iana\"},\"application/vnd.dvb.ipdcesgaccess\":{\"source\":\"iana\"},\"application/vnd.dvb.ipdcesgaccess2\":{\"source\":\"iana\"},\"application/vnd.dvb.ipdcesgpdd\":{\"source\":\"iana\"},\"application/vnd.dvb.ipdcroaming\":{\"source\":\"iana\"},\"application/vnd.dvb.iptv.alfec-base\":{\"source\":\"iana\"},\"application/vnd.dvb.iptv.alfec-enhancement\":{\"source\":\"iana\"},\"application/vnd.dvb.notif-aggregate-root+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.dvb.notif-container+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.dvb.notif-generic+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.dvb.notif-ia-msglist+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.dvb.notif-ia-registration-request+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.dvb.notif-ia-registration-response+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.dvb.notif-init+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.dvb.pfr\":{\"source\":\"iana\"},\"application/vnd.dvb.service\":{\"source\":\"iana\",\"extensions\":[\"svc\"]},\"application/vnd.dxr\":{\"source\":\"iana\"},\"application/vnd.dynageo\":{\"source\":\"iana\",\"extensions\":[\"geo\"]},\"application/vnd.dzr\":{\"source\":\"iana\"},\"application/vnd.easykaraoke.cdgdownload\":{\"source\":\"iana\"},\"application/vnd.ecdis-update\":{\"source\":\"iana\"},\"application/vnd.ecip.rlp\":{\"source\":\"iana\"},\"application/vnd.ecowin.chart\":{\"source\":\"iana\",\"extensions\":[\"mag\"]},\"application/vnd.ecowin.filerequest\":{\"source\":\"iana\"},\"application/vnd.ecowin.fileupdate\":{\"source\":\"iana\"},\"application/vnd.ecowin.series\":{\"source\":\"iana\"},\"application/vnd.ecowin.seriesrequest\":{\"source\":\"iana\"},\"application/vnd.ecowin.seriesupdate\":{\"source\":\"iana\"},\"application/vnd.efi.img\":{\"source\":\"iana\"},\"application/vnd.efi.iso\":{\"source\":\"iana\"},\"application/vnd.emclient.accessrequest+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.enliven\":{\"source\":\"iana\",\"extensions\":[\"nml\"]},\"application/vnd.enphase.envoy\":{\"source\":\"iana\"},\"application/vnd.eprints.data+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.epson.esf\":{\"source\":\"iana\",\"extensions\":[\"esf\"]},\"application/vnd.epson.msf\":{\"source\":\"iana\",\"extensions\":[\"msf\"]},\"application/vnd.epson.quickanime\":{\"source\":\"iana\",\"extensions\":[\"qam\"]},\"application/vnd.epson.salt\":{\"source\":\"iana\",\"extensions\":[\"slt\"]},\"application/vnd.epson.ssf\":{\"source\":\"iana\",\"extensions\":[\"ssf\"]},\"application/vnd.ericsson.quickcall\":{\"source\":\"iana\"},\"application/vnd.espass-espass+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.eszigno3+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"es3\",\"et3\"]},\"application/vnd.etsi.aoc+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.asic-e+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.etsi.asic-s+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.etsi.cug+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.iptvcommand+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.iptvdiscovery+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.iptvprofile+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.iptvsad-bc+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.iptvsad-cod+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.iptvsad-npvr+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.iptvservice+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.iptvsync+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.iptvueprofile+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.mcid+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.mheg5\":{\"source\":\"iana\"},\"application/vnd.etsi.overload-control-policy-dataset+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.pstn+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.sci+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.simservs+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.timestamp-token\":{\"source\":\"iana\"},\"application/vnd.etsi.tsl+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.etsi.tsl.der\":{\"source\":\"iana\"},\"application/vnd.eudora.data\":{\"source\":\"iana\"},\"application/vnd.evolv.ecig.profile\":{\"source\":\"iana\"},\"application/vnd.evolv.ecig.settings\":{\"source\":\"iana\"},\"application/vnd.evolv.ecig.theme\":{\"source\":\"iana\"},\"application/vnd.exstream-empower+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.exstream-package\":{\"source\":\"iana\"},\"application/vnd.ezpix-album\":{\"source\":\"iana\",\"extensions\":[\"ez2\"]},\"application/vnd.ezpix-package\":{\"source\":\"iana\",\"extensions\":[\"ez3\"]},\"application/vnd.f-secure.mobile\":{\"source\":\"iana\"},\"application/vnd.fastcopy-disk-image\":{\"source\":\"iana\"},\"application/vnd.fdf\":{\"source\":\"iana\",\"extensions\":[\"fdf\"]},\"application/vnd.fdsn.mseed\":{\"source\":\"iana\",\"extensions\":[\"mseed\"]},\"application/vnd.fdsn.seed\":{\"source\":\"iana\",\"extensions\":[\"seed\",\"dataless\"]},\"application/vnd.ffsns\":{\"source\":\"iana\"},\"application/vnd.ficlab.flb+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.filmit.zfc\":{\"source\":\"iana\"},\"application/vnd.fints\":{\"source\":\"iana\"},\"application/vnd.firemonkeys.cloudcell\":{\"source\":\"iana\"},\"application/vnd.flographit\":{\"source\":\"iana\",\"extensions\":[\"gph\"]},\"application/vnd.fluxtime.clip\":{\"source\":\"iana\",\"extensions\":[\"ftc\"]},\"application/vnd.font-fontforge-sfd\":{\"source\":\"iana\"},\"application/vnd.framemaker\":{\"source\":\"iana\",\"extensions\":[\"fm\",\"frame\",\"maker\",\"book\"]},\"application/vnd.frogans.fnc\":{\"source\":\"iana\",\"extensions\":[\"fnc\"]},\"application/vnd.frogans.ltf\":{\"source\":\"iana\",\"extensions\":[\"ltf\"]},\"application/vnd.fsc.weblaunch\":{\"source\":\"iana\",\"extensions\":[\"fsc\"]},\"application/vnd.fujitsu.oasys\":{\"source\":\"iana\",\"extensions\":[\"oas\"]},\"application/vnd.fujitsu.oasys2\":{\"source\":\"iana\",\"extensions\":[\"oa2\"]},\"application/vnd.fujitsu.oasys3\":{\"source\":\"iana\",\"extensions\":[\"oa3\"]},\"application/vnd.fujitsu.oasysgp\":{\"source\":\"iana\",\"extensions\":[\"fg5\"]},\"application/vnd.fujitsu.oasysprs\":{\"source\":\"iana\",\"extensions\":[\"bh2\"]},\"application/vnd.fujixerox.art-ex\":{\"source\":\"iana\"},\"application/vnd.fujixerox.art4\":{\"source\":\"iana\"},\"application/vnd.fujixerox.ddd\":{\"source\":\"iana\",\"extensions\":[\"ddd\"]},\"application/vnd.fujixerox.docuworks\":{\"source\":\"iana\",\"extensions\":[\"xdw\"]},\"application/vnd.fujixerox.docuworks.binder\":{\"source\":\"iana\",\"extensions\":[\"xbd\"]},\"application/vnd.fujixerox.docuworks.container\":{\"source\":\"iana\"},\"application/vnd.fujixerox.hbpl\":{\"source\":\"iana\"},\"application/vnd.fut-misnet\":{\"source\":\"iana\"},\"application/vnd.futoin+cbor\":{\"source\":\"iana\"},\"application/vnd.futoin+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.fuzzysheet\":{\"source\":\"iana\",\"extensions\":[\"fzs\"]},\"application/vnd.genomatix.tuxedo\":{\"source\":\"iana\",\"extensions\":[\"txd\"]},\"application/vnd.geo+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.geocube+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.geogebra.file\":{\"source\":\"iana\",\"extensions\":[\"ggb\"]},\"application/vnd.geogebra.tool\":{\"source\":\"iana\",\"extensions\":[\"ggt\"]},\"application/vnd.geometry-explorer\":{\"source\":\"iana\",\"extensions\":[\"gex\",\"gre\"]},\"application/vnd.geonext\":{\"source\":\"iana\",\"extensions\":[\"gxt\"]},\"application/vnd.geoplan\":{\"source\":\"iana\",\"extensions\":[\"g2w\"]},\"application/vnd.geospace\":{\"source\":\"iana\",\"extensions\":[\"g3w\"]},\"application/vnd.gerber\":{\"source\":\"iana\"},\"application/vnd.globalplatform.card-content-mgt\":{\"source\":\"iana\"},\"application/vnd.globalplatform.card-content-mgt-response\":{\"source\":\"iana\"},\"application/vnd.gmx\":{\"source\":\"iana\",\"extensions\":[\"gmx\"]},\"application/vnd.google-apps.document\":{\"compressible\":false,\"extensions\":[\"gdoc\"]},\"application/vnd.google-apps.presentation\":{\"compressible\":false,\"extensions\":[\"gslides\"]},\"application/vnd.google-apps.spreadsheet\":{\"compressible\":false,\"extensions\":[\"gsheet\"]},\"application/vnd.google-earth.kml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"kml\"]},\"application/vnd.google-earth.kmz\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"kmz\"]},\"application/vnd.gov.sk.e-form+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.gov.sk.e-form+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.gov.sk.xmldatacontainer+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.grafeq\":{\"source\":\"iana\",\"extensions\":[\"gqf\",\"gqs\"]},\"application/vnd.gridmp\":{\"source\":\"iana\"},\"application/vnd.groove-account\":{\"source\":\"iana\",\"extensions\":[\"gac\"]},\"application/vnd.groove-help\":{\"source\":\"iana\",\"extensions\":[\"ghf\"]},\"application/vnd.groove-identity-message\":{\"source\":\"iana\",\"extensions\":[\"gim\"]},\"application/vnd.groove-injector\":{\"source\":\"iana\",\"extensions\":[\"grv\"]},\"application/vnd.groove-tool-message\":{\"source\":\"iana\",\"extensions\":[\"gtm\"]},\"application/vnd.groove-tool-template\":{\"source\":\"iana\",\"extensions\":[\"tpl\"]},\"application/vnd.groove-vcard\":{\"source\":\"iana\",\"extensions\":[\"vcg\"]},\"application/vnd.hal+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.hal+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"hal\"]},\"application/vnd.handheld-entertainment+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"zmm\"]},\"application/vnd.hbci\":{\"source\":\"iana\",\"extensions\":[\"hbci\"]},\"application/vnd.hc+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.hcl-bireports\":{\"source\":\"iana\"},\"application/vnd.hdt\":{\"source\":\"iana\"},\"application/vnd.heroku+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.hhe.lesson-player\":{\"source\":\"iana\",\"extensions\":[\"les\"]},\"application/vnd.hp-hpgl\":{\"source\":\"iana\",\"extensions\":[\"hpgl\"]},\"application/vnd.hp-hpid\":{\"source\":\"iana\",\"extensions\":[\"hpid\"]},\"application/vnd.hp-hps\":{\"source\":\"iana\",\"extensions\":[\"hps\"]},\"application/vnd.hp-jlyt\":{\"source\":\"iana\",\"extensions\":[\"jlt\"]},\"application/vnd.hp-pcl\":{\"source\":\"iana\",\"extensions\":[\"pcl\"]},\"application/vnd.hp-pclxl\":{\"source\":\"iana\",\"extensions\":[\"pclxl\"]},\"application/vnd.httphone\":{\"source\":\"iana\"},\"application/vnd.hydrostatix.sof-data\":{\"source\":\"iana\",\"extensions\":[\"sfd-hdstx\"]},\"application/vnd.hyper+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.hyper-item+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.hyperdrive+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.hzn-3d-crossword\":{\"source\":\"iana\"},\"application/vnd.ibm.afplinedata\":{\"source\":\"iana\"},\"application/vnd.ibm.electronic-media\":{\"source\":\"iana\"},\"application/vnd.ibm.minipay\":{\"source\":\"iana\",\"extensions\":[\"mpy\"]},\"application/vnd.ibm.modcap\":{\"source\":\"iana\",\"extensions\":[\"afp\",\"listafp\",\"list3820\"]},\"application/vnd.ibm.rights-management\":{\"source\":\"iana\",\"extensions\":[\"irm\"]},\"application/vnd.ibm.secure-container\":{\"source\":\"iana\",\"extensions\":[\"sc\"]},\"application/vnd.iccprofile\":{\"source\":\"iana\",\"extensions\":[\"icc\",\"icm\"]},\"application/vnd.ieee.1905\":{\"source\":\"iana\"},\"application/vnd.igloader\":{\"source\":\"iana\",\"extensions\":[\"igl\"]},\"application/vnd.imagemeter.folder+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.imagemeter.image+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.immervision-ivp\":{\"source\":\"iana\",\"extensions\":[\"ivp\"]},\"application/vnd.immervision-ivu\":{\"source\":\"iana\",\"extensions\":[\"ivu\"]},\"application/vnd.ims.imsccv1p1\":{\"source\":\"iana\"},\"application/vnd.ims.imsccv1p2\":{\"source\":\"iana\"},\"application/vnd.ims.imsccv1p3\":{\"source\":\"iana\"},\"application/vnd.ims.lis.v2.result+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ims.lti.v2.toolconsumerprofile+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ims.lti.v2.toolproxy+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ims.lti.v2.toolproxy.id+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ims.lti.v2.toolsettings+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ims.lti.v2.toolsettings.simple+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.informedcontrol.rms+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.informix-visionary\":{\"source\":\"iana\"},\"application/vnd.infotech.project\":{\"source\":\"iana\"},\"application/vnd.infotech.project+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.innopath.wamp.notification\":{\"source\":\"iana\"},\"application/vnd.insors.igm\":{\"source\":\"iana\",\"extensions\":[\"igm\"]},\"application/vnd.intercon.formnet\":{\"source\":\"iana\",\"extensions\":[\"xpw\",\"xpx\"]},\"application/vnd.intergeo\":{\"source\":\"iana\",\"extensions\":[\"i2g\"]},\"application/vnd.intertrust.digibox\":{\"source\":\"iana\"},\"application/vnd.intertrust.nncp\":{\"source\":\"iana\"},\"application/vnd.intu.qbo\":{\"source\":\"iana\",\"extensions\":[\"qbo\"]},\"application/vnd.intu.qfx\":{\"source\":\"iana\",\"extensions\":[\"qfx\"]},\"application/vnd.iptc.g2.catalogitem+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.iptc.g2.conceptitem+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.iptc.g2.knowledgeitem+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.iptc.g2.newsitem+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.iptc.g2.newsmessage+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.iptc.g2.packageitem+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.iptc.g2.planningitem+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ipunplugged.rcprofile\":{\"source\":\"iana\",\"extensions\":[\"rcprofile\"]},\"application/vnd.irepository.package+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"irp\"]},\"application/vnd.is-xpr\":{\"source\":\"iana\",\"extensions\":[\"xpr\"]},\"application/vnd.isac.fcs\":{\"source\":\"iana\",\"extensions\":[\"fcs\"]},\"application/vnd.iso11783-10+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.jam\":{\"source\":\"iana\",\"extensions\":[\"jam\"]},\"application/vnd.japannet-directory-service\":{\"source\":\"iana\"},\"application/vnd.japannet-jpnstore-wakeup\":{\"source\":\"iana\"},\"application/vnd.japannet-payment-wakeup\":{\"source\":\"iana\"},\"application/vnd.japannet-registration\":{\"source\":\"iana\"},\"application/vnd.japannet-registration-wakeup\":{\"source\":\"iana\"},\"application/vnd.japannet-setstore-wakeup\":{\"source\":\"iana\"},\"application/vnd.japannet-verification\":{\"source\":\"iana\"},\"application/vnd.japannet-verification-wakeup\":{\"source\":\"iana\"},\"application/vnd.jcp.javame.midlet-rms\":{\"source\":\"iana\",\"extensions\":[\"rms\"]},\"application/vnd.jisp\":{\"source\":\"iana\",\"extensions\":[\"jisp\"]},\"application/vnd.joost.joda-archive\":{\"source\":\"iana\",\"extensions\":[\"joda\"]},\"application/vnd.jsk.isdn-ngn\":{\"source\":\"iana\"},\"application/vnd.kahootz\":{\"source\":\"iana\",\"extensions\":[\"ktz\",\"ktr\"]},\"application/vnd.kde.karbon\":{\"source\":\"iana\",\"extensions\":[\"karbon\"]},\"application/vnd.kde.kchart\":{\"source\":\"iana\",\"extensions\":[\"chrt\"]},\"application/vnd.kde.kformula\":{\"source\":\"iana\",\"extensions\":[\"kfo\"]},\"application/vnd.kde.kivio\":{\"source\":\"iana\",\"extensions\":[\"flw\"]},\"application/vnd.kde.kontour\":{\"source\":\"iana\",\"extensions\":[\"kon\"]},\"application/vnd.kde.kpresenter\":{\"source\":\"iana\",\"extensions\":[\"kpr\",\"kpt\"]},\"application/vnd.kde.kspread\":{\"source\":\"iana\",\"extensions\":[\"ksp\"]},\"application/vnd.kde.kword\":{\"source\":\"iana\",\"extensions\":[\"kwd\",\"kwt\"]},\"application/vnd.kenameaapp\":{\"source\":\"iana\",\"extensions\":[\"htke\"]},\"application/vnd.kidspiration\":{\"source\":\"iana\",\"extensions\":[\"kia\"]},\"application/vnd.kinar\":{\"source\":\"iana\",\"extensions\":[\"kne\",\"knp\"]},\"application/vnd.koan\":{\"source\":\"iana\",\"extensions\":[\"skp\",\"skd\",\"skt\",\"skm\"]},\"application/vnd.kodak-descriptor\":{\"source\":\"iana\",\"extensions\":[\"sse\"]},\"application/vnd.las\":{\"source\":\"iana\"},\"application/vnd.las.las+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.las.las+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"lasxml\"]},\"application/vnd.laszip\":{\"source\":\"iana\"},\"application/vnd.leap+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.liberty-request+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.llamagraphics.life-balance.desktop\":{\"source\":\"iana\",\"extensions\":[\"lbd\"]},\"application/vnd.llamagraphics.life-balance.exchange+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"lbe\"]},\"application/vnd.logipipe.circuit+zip\":{\"source\":\"iana\",\"compressible\":false},\"application/vnd.loom\":{\"source\":\"iana\"},\"application/vnd.lotus-1-2-3\":{\"source\":\"iana\",\"extensions\":[\"123\"]},\"application/vnd.lotus-approach\":{\"source\":\"iana\",\"extensions\":[\"apr\"]},\"application/vnd.lotus-freelance\":{\"source\":\"iana\",\"extensions\":[\"pre\"]},\"application/vnd.lotus-notes\":{\"source\":\"iana\",\"extensions\":[\"nsf\"]},\"application/vnd.lotus-organizer\":{\"source\":\"iana\",\"extensions\":[\"org\"]},\"application/vnd.lotus-screencam\":{\"source\":\"iana\",\"extensions\":[\"scm\"]},\"application/vnd.lotus-wordpro\":{\"source\":\"iana\",\"extensions\":[\"lwp\"]},\"application/vnd.macports.portpkg\":{\"source\":\"iana\",\"extensions\":[\"portpkg\"]},\"application/vnd.mapbox-vector-tile\":{\"source\":\"iana\"},\"application/vnd.marlin.drm.actiontoken+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.marlin.drm.conftoken+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.marlin.drm.license+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.marlin.drm.mdcf\":{\"source\":\"iana\"},\"application/vnd.mason+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.maxmind.maxmind-db\":{\"source\":\"iana\"},\"application/vnd.mcd\":{\"source\":\"iana\",\"extensions\":[\"mcd\"]},\"application/vnd.medcalcdata\":{\"source\":\"iana\",\"extensions\":[\"mc1\"]},\"application/vnd.mediastation.cdkey\":{\"source\":\"iana\",\"extensions\":[\"cdkey\"]},\"application/vnd.meridian-slingshot\":{\"source\":\"iana\"},\"application/vnd.mfer\":{\"source\":\"iana\",\"extensions\":[\"mwf\"]},\"application/vnd.mfmp\":{\"source\":\"iana\",\"extensions\":[\"mfm\"]},\"application/vnd.micro+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.micrografx.flo\":{\"source\":\"iana\",\"extensions\":[\"flo\"]},\"application/vnd.micrografx.igx\":{\"source\":\"iana\",\"extensions\":[\"igx\"]},\"application/vnd.microsoft.portable-executable\":{\"source\":\"iana\"},\"application/vnd.microsoft.windows.thumbnail-cache\":{\"source\":\"iana\"},\"application/vnd.miele+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.mif\":{\"source\":\"iana\",\"extensions\":[\"mif\"]},\"application/vnd.minisoft-hp3000-save\":{\"source\":\"iana\"},\"application/vnd.mitsubishi.misty-guard.trustweb\":{\"source\":\"iana\"},\"application/vnd.mobius.daf\":{\"source\":\"iana\",\"extensions\":[\"daf\"]},\"application/vnd.mobius.dis\":{\"source\":\"iana\",\"extensions\":[\"dis\"]},\"application/vnd.mobius.mbk\":{\"source\":\"iana\",\"extensions\":[\"mbk\"]},\"application/vnd.mobius.mqy\":{\"source\":\"iana\",\"extensions\":[\"mqy\"]},\"application/vnd.mobius.msl\":{\"source\":\"iana\",\"extensions\":[\"msl\"]},\"application/vnd.mobius.plc\":{\"source\":\"iana\",\"extensions\":[\"plc\"]},\"application/vnd.mobius.txf\":{\"source\":\"iana\",\"extensions\":[\"txf\"]},\"application/vnd.mophun.application\":{\"source\":\"iana\",\"extensions\":[\"mpn\"]},\"application/vnd.mophun.certificate\":{\"source\":\"iana\",\"extensions\":[\"mpc\"]},\"application/vnd.motorola.flexsuite\":{\"source\":\"iana\"},\"application/vnd.motorola.flexsuite.adsi\":{\"source\":\"iana\"},\"application/vnd.motorola.flexsuite.fis\":{\"source\":\"iana\"},\"application/vnd.motorola.flexsuite.gotap\":{\"source\":\"iana\"},\"application/vnd.motorola.flexsuite.kmr\":{\"source\":\"iana\"},\"application/vnd.motorola.flexsuite.ttc\":{\"source\":\"iana\"},\"application/vnd.motorola.flexsuite.wem\":{\"source\":\"iana\"},\"application/vnd.motorola.iprm\":{\"source\":\"iana\"},\"application/vnd.mozilla.xul+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xul\"]},\"application/vnd.ms-3mfdocument\":{\"source\":\"iana\"},\"application/vnd.ms-artgalry\":{\"source\":\"iana\",\"extensions\":[\"cil\"]},\"application/vnd.ms-asf\":{\"source\":\"iana\"},\"application/vnd.ms-cab-compressed\":{\"source\":\"iana\",\"extensions\":[\"cab\"]},\"application/vnd.ms-color.iccprofile\":{\"source\":\"apache\"},\"application/vnd.ms-excel\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"xls\",\"xlm\",\"xla\",\"xlc\",\"xlt\",\"xlw\"]},\"application/vnd.ms-excel.addin.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"xlam\"]},\"application/vnd.ms-excel.sheet.binary.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"xlsb\"]},\"application/vnd.ms-excel.sheet.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"xlsm\"]},\"application/vnd.ms-excel.template.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"xltm\"]},\"application/vnd.ms-fontobject\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"eot\"]},\"application/vnd.ms-htmlhelp\":{\"source\":\"iana\",\"extensions\":[\"chm\"]},\"application/vnd.ms-ims\":{\"source\":\"iana\",\"extensions\":[\"ims\"]},\"application/vnd.ms-lrm\":{\"source\":\"iana\",\"extensions\":[\"lrm\"]},\"application/vnd.ms-office.activex+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ms-officetheme\":{\"source\":\"iana\",\"extensions\":[\"thmx\"]},\"application/vnd.ms-opentype\":{\"source\":\"apache\",\"compressible\":true},\"application/vnd.ms-outlook\":{\"compressible\":false,\"extensions\":[\"msg\"]},\"application/vnd.ms-package.obfuscated-opentype\":{\"source\":\"apache\"},\"application/vnd.ms-pki.seccat\":{\"source\":\"apache\",\"extensions\":[\"cat\"]},\"application/vnd.ms-pki.stl\":{\"source\":\"apache\",\"extensions\":[\"stl\"]},\"application/vnd.ms-playready.initiator+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ms-powerpoint\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"ppt\",\"pps\",\"pot\"]},\"application/vnd.ms-powerpoint.addin.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"ppam\"]},\"application/vnd.ms-powerpoint.presentation.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"pptm\"]},\"application/vnd.ms-powerpoint.slide.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"sldm\"]},\"application/vnd.ms-powerpoint.slideshow.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"ppsm\"]},\"application/vnd.ms-powerpoint.template.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"potm\"]},\"application/vnd.ms-printdevicecapabilities+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ms-printing.printticket+xml\":{\"source\":\"apache\",\"compressible\":true},\"application/vnd.ms-printschematicket+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.ms-project\":{\"source\":\"iana\",\"extensions\":[\"mpp\",\"mpt\"]},\"application/vnd.ms-tnef\":{\"source\":\"iana\"},\"application/vnd.ms-windows.devicepairing\":{\"source\":\"iana\"},\"application/vnd.ms-windows.nwprinting.oob\":{\"source\":\"iana\"},\"application/vnd.ms-windows.printerpairing\":{\"source\":\"iana\"},\"application/vnd.ms-windows.wsd.oob\":{\"source\":\"iana\"},\"application/vnd.ms-wmdrm.lic-chlg-req\":{\"source\":\"iana\"},\"application/vnd.ms-wmdrm.lic-resp\":{\"source\":\"iana\"},\"application/vnd.ms-wmdrm.meter-chlg-req\":{\"source\":\"iana\"},\"application/vnd.ms-wmdrm.meter-resp\":{\"source\":\"iana\"},\"application/vnd.ms-word.document.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"docm\"]},\"application/vnd.ms-word.template.macroenabled.12\":{\"source\":\"iana\",\"extensions\":[\"dotm\"]},\"application/vnd.ms-works\":{\"source\":\"iana\",\"extensions\":[\"wps\",\"wks\",\"wcm\",\"wdb\"]},\"application/vnd.ms-wpl\":{\"source\":\"iana\",\"extensions\":[\"wpl\"]},\"application/vnd.ms-xpsdocument\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"xps\"]},\"application/vnd.msa-disk-image\":{\"source\":\"iana\"},\"application/vnd.mseq\":{\"source\":\"iana\",\"extensions\":[\"mseq\"]},\"application/vnd.msign\":{\"source\":\"iana\"},\"application/vnd.multiad.creator\":{\"source\":\"iana\"},\"application/vnd.multiad.creator.cif\":{\"source\":\"iana\"},\"application/vnd.music-niff\":{\"source\":\"iana\"},\"application/vnd.musician\":{\"source\":\"iana\",\"extensions\":[\"mus\"]},\"application/vnd.muvee.style\":{\"source\":\"iana\",\"extensions\":[\"msty\"]},\"application/vnd.mynfc\":{\"source\":\"iana\",\"extensions\":[\"taglet\"]},\"application/vnd.ncd.control\":{\"source\":\"iana\"},\"application/vnd.ncd.reference\":{\"source\":\"iana\"},\"application/vnd.nearst.inv+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.nervana\":{\"source\":\"iana\"},\"application/vnd.netfpx\":{\"source\":\"iana\"},\"application/vnd.neurolanguage.nlu\":{\"source\":\"iana\",\"extensions\":[\"nlu\"]},\"application/vnd.nimn\":{\"source\":\"iana\"},\"application/vnd.nintendo.nitro.rom\":{\"source\":\"iana\"},\"application/vnd.nintendo.snes.rom\":{\"source\":\"iana\"},\"application/vnd.nitf\":{\"source\":\"iana\",\"extensions\":[\"ntf\",\"nitf\"]},\"application/vnd.noblenet-directory\":{\"source\":\"iana\",\"extensions\":[\"nnd\"]},\"application/vnd.noblenet-sealer\":{\"source\":\"iana\",\"extensions\":[\"nns\"]},\"application/vnd.noblenet-web\":{\"source\":\"iana\",\"extensions\":[\"nnw\"]},\"application/vnd.nokia.catalogs\":{\"source\":\"iana\"},\"application/vnd.nokia.conml+wbxml\":{\"source\":\"iana\"},\"application/vnd.nokia.conml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.nokia.iptv.config+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.nokia.isds-radio-presets\":{\"source\":\"iana\"},\"application/vnd.nokia.landmark+wbxml\":{\"source\":\"iana\"},\"application/vnd.nokia.landmark+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.nokia.landmarkcollection+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.nokia.n-gage.ac+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.nokia.n-gage.data\":{\"source\":\"iana\",\"extensions\":[\"ngdat\"]},\"application/vnd.nokia.n-gage.symbian.install\":{\"source\":\"iana\",\"extensions\":[\"n-gage\"]},\"application/vnd.nokia.ncd\":{\"source\":\"iana\"},\"application/vnd.nokia.pcd+wbxml\":{\"source\":\"iana\"},\"application/vnd.nokia.pcd+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.nokia.radio-preset\":{\"source\":\"iana\",\"extensions\":[\"rpst\"]},\"application/vnd.nokia.radio-presets\":{\"source\":\"iana\",\"extensions\":[\"rpss\"]},\"application/vnd.novadigm.edm\":{\"source\":\"iana\",\"extensions\":[\"edm\"]},\"application/vnd.novadigm.edx\":{\"source\":\"iana\",\"extensions\":[\"edx\"]},\"application/vnd.novadigm.ext\":{\"source\":\"iana\",\"extensions\":[\"ext\"]},\"application/vnd.ntt-local.content-share\":{\"source\":\"iana\"},\"application/vnd.ntt-local.file-transfer\":{\"source\":\"iana\"},\"application/vnd.ntt-local.ogw_remote-access\":{\"source\":\"iana\"},\"application/vnd.ntt-local.sip-ta_remote\":{\"source\":\"iana\"},\"application/vnd.ntt-local.sip-ta_tcp_stream\":{\"source\":\"iana\"},\"application/vnd.oasis.opendocument.chart\":{\"source\":\"iana\",\"extensions\":[\"odc\"]},\"application/vnd.oasis.opendocument.chart-template\":{\"source\":\"iana\",\"extensions\":[\"otc\"]},\"application/vnd.oasis.opendocument.database\":{\"source\":\"iana\",\"extensions\":[\"odb\"]},\"application/vnd.oasis.opendocument.formula\":{\"source\":\"iana\",\"extensions\":[\"odf\"]},\"application/vnd.oasis.opendocument.formula-template\":{\"source\":\"iana\",\"extensions\":[\"odft\"]},\"application/vnd.oasis.opendocument.graphics\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"odg\"]},\"application/vnd.oasis.opendocument.graphics-template\":{\"source\":\"iana\",\"extensions\":[\"otg\"]},\"application/vnd.oasis.opendocument.image\":{\"source\":\"iana\",\"extensions\":[\"odi\"]},\"application/vnd.oasis.opendocument.image-template\":{\"source\":\"iana\",\"extensions\":[\"oti\"]},\"application/vnd.oasis.opendocument.presentation\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"odp\"]},\"application/vnd.oasis.opendocument.presentation-template\":{\"source\":\"iana\",\"extensions\":[\"otp\"]},\"application/vnd.oasis.opendocument.spreadsheet\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"ods\"]},\"application/vnd.oasis.opendocument.spreadsheet-template\":{\"source\":\"iana\",\"extensions\":[\"ots\"]},\"application/vnd.oasis.opendocument.text\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"odt\"]},\"application/vnd.oasis.opendocument.text-master\":{\"source\":\"iana\",\"extensions\":[\"odm\"]},\"application/vnd.oasis.opendocument.text-template\":{\"source\":\"iana\",\"extensions\":[\"ott\"]},\"application/vnd.oasis.opendocument.text-web\":{\"source\":\"iana\",\"extensions\":[\"oth\"]},\"application/vnd.obn\":{\"source\":\"iana\"},\"application/vnd.ocf+cbor\":{\"source\":\"iana\"},\"application/vnd.oftn.l10n+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oipf.contentaccessdownload+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oipf.contentaccessstreaming+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oipf.cspg-hexbinary\":{\"source\":\"iana\"},\"application/vnd.oipf.dae.svg+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oipf.dae.xhtml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oipf.mippvcontrolmessage+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oipf.pae.gem\":{\"source\":\"iana\"},\"application/vnd.oipf.spdiscovery+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oipf.spdlist+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oipf.ueprofile+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oipf.userprofile+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.olpc-sugar\":{\"source\":\"iana\",\"extensions\":[\"xo\"]},\"application/vnd.oma-scws-config\":{\"source\":\"iana\"},\"application/vnd.oma-scws-http-request\":{\"source\":\"iana\"},\"application/vnd.oma-scws-http-response\":{\"source\":\"iana\"},\"application/vnd.oma.bcast.associated-procedure-parameter+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.bcast.drm-trigger+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.bcast.imd+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.bcast.ltkm\":{\"source\":\"iana\"},\"application/vnd.oma.bcast.notification+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.bcast.provisioningtrigger\":{\"source\":\"iana\"},\"application/vnd.oma.bcast.sgboot\":{\"source\":\"iana\"},\"application/vnd.oma.bcast.sgdd+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.bcast.sgdu\":{\"source\":\"iana\"},\"application/vnd.oma.bcast.simple-symbol-container\":{\"source\":\"iana\"},\"application/vnd.oma.bcast.smartcard-trigger+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.bcast.sprov+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.bcast.stkm\":{\"source\":\"iana\"},\"application/vnd.oma.cab-address-book+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.cab-feature-handler+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.cab-pcc+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.cab-subs-invite+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.cab-user-prefs+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.dcd\":{\"source\":\"iana\"},\"application/vnd.oma.dcdc\":{\"source\":\"iana\"},\"application/vnd.oma.dd2+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"dd2\"]},\"application/vnd.oma.drm.risd+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.group-usage-list+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.lwm2m+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.lwm2m+tlv\":{\"source\":\"iana\"},\"application/vnd.oma.pal+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.poc.detailed-progress-report+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.poc.final-report+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.poc.groups+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.poc.invocation-descriptor+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.poc.optimized-progress-report+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.push\":{\"source\":\"iana\"},\"application/vnd.oma.scidm.messages+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oma.xcap-directory+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.omads-email+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.omads-file+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.omads-folder+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.omaloc-supl-init\":{\"source\":\"iana\"},\"application/vnd.onepager\":{\"source\":\"iana\"},\"application/vnd.onepagertamp\":{\"source\":\"iana\"},\"application/vnd.onepagertamx\":{\"source\":\"iana\"},\"application/vnd.onepagertat\":{\"source\":\"iana\"},\"application/vnd.onepagertatp\":{\"source\":\"iana\"},\"application/vnd.onepagertatx\":{\"source\":\"iana\"},\"application/vnd.openblox.game+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openblox.game-binary\":{\"source\":\"iana\"},\"application/vnd.openeye.oeb\":{\"source\":\"iana\"},\"application/vnd.openofficeorg.extension\":{\"source\":\"apache\",\"extensions\":[\"oxt\"]},\"application/vnd.openstreetmap.data+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.custom-properties+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.customxmlproperties+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.drawing+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.drawingml.chart+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.extended-properties+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.comments+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.presentation\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"pptx\"]},\"application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.presprops+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.slide\":{\"source\":\"iana\",\"extensions\":[\"sldx\"]},\"application/vnd.openxmlformats-officedocument.presentationml.slide+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.slideshow\":{\"source\":\"iana\",\"extensions\":[\"ppsx\"]},\"application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.tags+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.template\":{\"source\":\"iana\",\"extensions\":[\"potx\"]},\"application/vnd.openxmlformats-officedocument.presentationml.template.main+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"xlsx\"]},\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.template\":{\"source\":\"iana\",\"extensions\":[\"xltx\"]},\"application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.theme+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.themeoverride+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.vmldrawing\":{\"source\":\"iana\"},\"application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"docx\"]},\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.template\":{\"source\":\"iana\",\"extensions\":[\"dotx\"]},\"application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-package.core-properties+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.openxmlformats-package.relationships+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oracle.resource+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.orange.indata\":{\"source\":\"iana\"},\"application/vnd.osa.netdeploy\":{\"source\":\"iana\"},\"application/vnd.osgeo.mapguide.package\":{\"source\":\"iana\",\"extensions\":[\"mgp\"]},\"application/vnd.osgi.bundle\":{\"source\":\"iana\"},\"application/vnd.osgi.dp\":{\"source\":\"iana\",\"extensions\":[\"dp\"]},\"application/vnd.osgi.subsystem\":{\"source\":\"iana\",\"extensions\":[\"esa\"]},\"application/vnd.otps.ct-kip+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.oxli.countgraph\":{\"source\":\"iana\"},\"application/vnd.pagerduty+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.palm\":{\"source\":\"iana\",\"extensions\":[\"pdb\",\"pqa\",\"oprc\"]},\"application/vnd.panoply\":{\"source\":\"iana\"},\"application/vnd.paos.xml\":{\"source\":\"iana\"},\"application/vnd.patentdive\":{\"source\":\"iana\"},\"application/vnd.patientecommsdoc\":{\"source\":\"iana\"},\"application/vnd.pawaafile\":{\"source\":\"iana\",\"extensions\":[\"paw\"]},\"application/vnd.pcos\":{\"source\":\"iana\"},\"application/vnd.pg.format\":{\"source\":\"iana\",\"extensions\":[\"str\"]},\"application/vnd.pg.osasli\":{\"source\":\"iana\",\"extensions\":[\"ei6\"]},\"application/vnd.piaccess.application-licence\":{\"source\":\"iana\"},\"application/vnd.picsel\":{\"source\":\"iana\",\"extensions\":[\"efif\"]},\"application/vnd.pmi.widget\":{\"source\":\"iana\",\"extensions\":[\"wg\"]},\"application/vnd.poc.group-advertisement+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.pocketlearn\":{\"source\":\"iana\",\"extensions\":[\"plf\"]},\"application/vnd.powerbuilder6\":{\"source\":\"iana\",\"extensions\":[\"pbd\"]},\"application/vnd.powerbuilder6-s\":{\"source\":\"iana\"},\"application/vnd.powerbuilder7\":{\"source\":\"iana\"},\"application/vnd.powerbuilder7-s\":{\"source\":\"iana\"},\"application/vnd.powerbuilder75\":{\"source\":\"iana\"},\"application/vnd.powerbuilder75-s\":{\"source\":\"iana\"},\"application/vnd.preminet\":{\"source\":\"iana\"},\"application/vnd.previewsystems.box\":{\"source\":\"iana\",\"extensions\":[\"box\"]},\"application/vnd.proteus.magazine\":{\"source\":\"iana\",\"extensions\":[\"mgz\"]},\"application/vnd.psfs\":{\"source\":\"iana\"},\"application/vnd.publishare-delta-tree\":{\"source\":\"iana\",\"extensions\":[\"qps\"]},\"application/vnd.pvi.ptid1\":{\"source\":\"iana\",\"extensions\":[\"ptid\"]},\"application/vnd.pwg-multiplexed\":{\"source\":\"iana\"},\"application/vnd.pwg-xhtml-print+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.qualcomm.brew-app-res\":{\"source\":\"iana\"},\"application/vnd.quarantainenet\":{\"source\":\"iana\"},\"application/vnd.quark.quarkxpress\":{\"source\":\"iana\",\"extensions\":[\"qxd\",\"qxt\",\"qwd\",\"qwt\",\"qxl\",\"qxb\"]},\"application/vnd.quobject-quoxdocument\":{\"source\":\"iana\"},\"application/vnd.radisys.moml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-audit+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-audit-conf+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-audit-conn+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-audit-dialog+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-audit-stream+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-conf+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-dialog+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-dialog-base+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-dialog-fax-detect+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-dialog-fax-sendrecv+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-dialog-group+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-dialog-speech+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.radisys.msml-dialog-transform+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.rainstor.data\":{\"source\":\"iana\"},\"application/vnd.rapid\":{\"source\":\"iana\"},\"application/vnd.rar\":{\"source\":\"iana\"},\"application/vnd.realvnc.bed\":{\"source\":\"iana\",\"extensions\":[\"bed\"]},\"application/vnd.recordare.musicxml\":{\"source\":\"iana\",\"extensions\":[\"mxl\"]},\"application/vnd.recordare.musicxml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"musicxml\"]},\"application/vnd.renlearn.rlprint\":{\"source\":\"iana\"},\"application/vnd.restful+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.rig.cryptonote\":{\"source\":\"iana\",\"extensions\":[\"cryptonote\"]},\"application/vnd.rim.cod\":{\"source\":\"apache\",\"extensions\":[\"cod\"]},\"application/vnd.rn-realmedia\":{\"source\":\"apache\",\"extensions\":[\"rm\"]},\"application/vnd.rn-realmedia-vbr\":{\"source\":\"apache\",\"extensions\":[\"rmvb\"]},\"application/vnd.route66.link66+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"link66\"]},\"application/vnd.rs-274x\":{\"source\":\"iana\"},\"application/vnd.ruckus.download\":{\"source\":\"iana\"},\"application/vnd.s3sms\":{\"source\":\"iana\"},\"application/vnd.sailingtracker.track\":{\"source\":\"iana\",\"extensions\":[\"st\"]},\"application/vnd.sbm.cid\":{\"source\":\"iana\"},\"application/vnd.sbm.mid2\":{\"source\":\"iana\"},\"application/vnd.scribus\":{\"source\":\"iana\"},\"application/vnd.sealed.3df\":{\"source\":\"iana\"},\"application/vnd.sealed.csf\":{\"source\":\"iana\"},\"application/vnd.sealed.doc\":{\"source\":\"iana\"},\"application/vnd.sealed.eml\":{\"source\":\"iana\"},\"application/vnd.sealed.mht\":{\"source\":\"iana\"},\"application/vnd.sealed.net\":{\"source\":\"iana\"},\"application/vnd.sealed.ppt\":{\"source\":\"iana\"},\"application/vnd.sealed.tiff\":{\"source\":\"iana\"},\"application/vnd.sealed.xls\":{\"source\":\"iana\"},\"application/vnd.sealedmedia.softseal.html\":{\"source\":\"iana\"},\"application/vnd.sealedmedia.softseal.pdf\":{\"source\":\"iana\"},\"application/vnd.seemail\":{\"source\":\"iana\",\"extensions\":[\"see\"]},\"application/vnd.sema\":{\"source\":\"iana\",\"extensions\":[\"sema\"]},\"application/vnd.semd\":{\"source\":\"iana\",\"extensions\":[\"semd\"]},\"application/vnd.semf\":{\"source\":\"iana\",\"extensions\":[\"semf\"]},\"application/vnd.shade-save-file\":{\"source\":\"iana\"},\"application/vnd.shana.informed.formdata\":{\"source\":\"iana\",\"extensions\":[\"ifm\"]},\"application/vnd.shana.informed.formtemplate\":{\"source\":\"iana\",\"extensions\":[\"itp\"]},\"application/vnd.shana.informed.interchange\":{\"source\":\"iana\",\"extensions\":[\"iif\"]},\"application/vnd.shana.informed.package\":{\"source\":\"iana\",\"extensions\":[\"ipk\"]},\"application/vnd.shootproof+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.shopkick+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.sigrok.session\":{\"source\":\"iana\"},\"application/vnd.simtech-mindmapper\":{\"source\":\"iana\",\"extensions\":[\"twd\",\"twds\"]},\"application/vnd.siren+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.smaf\":{\"source\":\"iana\",\"extensions\":[\"mmf\"]},\"application/vnd.smart.notebook\":{\"source\":\"iana\"},\"application/vnd.smart.teacher\":{\"source\":\"iana\",\"extensions\":[\"teacher\"]},\"application/vnd.software602.filler.form+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.software602.filler.form-xml-zip\":{\"source\":\"iana\"},\"application/vnd.solent.sdkm+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"sdkm\",\"sdkd\"]},\"application/vnd.spotfire.dxp\":{\"source\":\"iana\",\"extensions\":[\"dxp\"]},\"application/vnd.spotfire.sfs\":{\"source\":\"iana\",\"extensions\":[\"sfs\"]},\"application/vnd.sqlite3\":{\"source\":\"iana\"},\"application/vnd.sss-cod\":{\"source\":\"iana\"},\"application/vnd.sss-dtf\":{\"source\":\"iana\"},\"application/vnd.sss-ntf\":{\"source\":\"iana\"},\"application/vnd.stardivision.calc\":{\"source\":\"apache\",\"extensions\":[\"sdc\"]},\"application/vnd.stardivision.draw\":{\"source\":\"apache\",\"extensions\":[\"sda\"]},\"application/vnd.stardivision.impress\":{\"source\":\"apache\",\"extensions\":[\"sdd\"]},\"application/vnd.stardivision.math\":{\"source\":\"apache\",\"extensions\":[\"smf\"]},\"application/vnd.stardivision.writer\":{\"source\":\"apache\",\"extensions\":[\"sdw\",\"vor\"]},\"application/vnd.stardivision.writer-global\":{\"source\":\"apache\",\"extensions\":[\"sgl\"]},\"application/vnd.stepmania.package\":{\"source\":\"iana\",\"extensions\":[\"smzip\"]},\"application/vnd.stepmania.stepchart\":{\"source\":\"iana\",\"extensions\":[\"sm\"]},\"application/vnd.street-stream\":{\"source\":\"iana\"},\"application/vnd.sun.wadl+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"wadl\"]},\"application/vnd.sun.xml.calc\":{\"source\":\"apache\",\"extensions\":[\"sxc\"]},\"application/vnd.sun.xml.calc.template\":{\"source\":\"apache\",\"extensions\":[\"stc\"]},\"application/vnd.sun.xml.draw\":{\"source\":\"apache\",\"extensions\":[\"sxd\"]},\"application/vnd.sun.xml.draw.template\":{\"source\":\"apache\",\"extensions\":[\"std\"]},\"application/vnd.sun.xml.impress\":{\"source\":\"apache\",\"extensions\":[\"sxi\"]},\"application/vnd.sun.xml.impress.template\":{\"source\":\"apache\",\"extensions\":[\"sti\"]},\"application/vnd.sun.xml.math\":{\"source\":\"apache\",\"extensions\":[\"sxm\"]},\"application/vnd.sun.xml.writer\":{\"source\":\"apache\",\"extensions\":[\"sxw\"]},\"application/vnd.sun.xml.writer.global\":{\"source\":\"apache\",\"extensions\":[\"sxg\"]},\"application/vnd.sun.xml.writer.template\":{\"source\":\"apache\",\"extensions\":[\"stw\"]},\"application/vnd.sus-calendar\":{\"source\":\"iana\",\"extensions\":[\"sus\",\"susp\"]},\"application/vnd.svd\":{\"source\":\"iana\",\"extensions\":[\"svd\"]},\"application/vnd.swiftview-ics\":{\"source\":\"iana\"},\"application/vnd.symbian.install\":{\"source\":\"apache\",\"extensions\":[\"sis\",\"sisx\"]},\"application/vnd.syncml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xsm\"]},\"application/vnd.syncml.dm+wbxml\":{\"source\":\"iana\",\"extensions\":[\"bdm\"]},\"application/vnd.syncml.dm+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xdm\"]},\"application/vnd.syncml.dm.notification\":{\"source\":\"iana\"},\"application/vnd.syncml.dmddf+wbxml\":{\"source\":\"iana\"},\"application/vnd.syncml.dmddf+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.syncml.dmtnds+wbxml\":{\"source\":\"iana\"},\"application/vnd.syncml.dmtnds+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.syncml.ds.notification\":{\"source\":\"iana\"},\"application/vnd.tableschema+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.tao.intent-module-archive\":{\"source\":\"iana\",\"extensions\":[\"tao\"]},\"application/vnd.tcpdump.pcap\":{\"source\":\"iana\",\"extensions\":[\"pcap\",\"cap\",\"dmp\"]},\"application/vnd.think-cell.ppttc+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.tmd.mediaflex.api+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.tml\":{\"source\":\"iana\"},\"application/vnd.tmobile-livetv\":{\"source\":\"iana\",\"extensions\":[\"tmo\"]},\"application/vnd.tri.onesource\":{\"source\":\"iana\"},\"application/vnd.trid.tpt\":{\"source\":\"iana\",\"extensions\":[\"tpt\"]},\"application/vnd.triscape.mxs\":{\"source\":\"iana\",\"extensions\":[\"mxs\"]},\"application/vnd.trueapp\":{\"source\":\"iana\",\"extensions\":[\"tra\"]},\"application/vnd.truedoc\":{\"source\":\"iana\"},\"application/vnd.ubisoft.webplayer\":{\"source\":\"iana\"},\"application/vnd.ufdl\":{\"source\":\"iana\",\"extensions\":[\"ufd\",\"ufdl\"]},\"application/vnd.uiq.theme\":{\"source\":\"iana\",\"extensions\":[\"utz\"]},\"application/vnd.umajin\":{\"source\":\"iana\",\"extensions\":[\"umj\"]},\"application/vnd.unity\":{\"source\":\"iana\",\"extensions\":[\"unityweb\"]},\"application/vnd.uoml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"uoml\"]},\"application/vnd.uplanet.alert\":{\"source\":\"iana\"},\"application/vnd.uplanet.alert-wbxml\":{\"source\":\"iana\"},\"application/vnd.uplanet.bearer-choice\":{\"source\":\"iana\"},\"application/vnd.uplanet.bearer-choice-wbxml\":{\"source\":\"iana\"},\"application/vnd.uplanet.cacheop\":{\"source\":\"iana\"},\"application/vnd.uplanet.cacheop-wbxml\":{\"source\":\"iana\"},\"application/vnd.uplanet.channel\":{\"source\":\"iana\"},\"application/vnd.uplanet.channel-wbxml\":{\"source\":\"iana\"},\"application/vnd.uplanet.list\":{\"source\":\"iana\"},\"application/vnd.uplanet.list-wbxml\":{\"source\":\"iana\"},\"application/vnd.uplanet.listcmd\":{\"source\":\"iana\"},\"application/vnd.uplanet.listcmd-wbxml\":{\"source\":\"iana\"},\"application/vnd.uplanet.signal\":{\"source\":\"iana\"},\"application/vnd.uri-map\":{\"source\":\"iana\"},\"application/vnd.valve.source.material\":{\"source\":\"iana\"},\"application/vnd.vcx\":{\"source\":\"iana\",\"extensions\":[\"vcx\"]},\"application/vnd.vd-study\":{\"source\":\"iana\"},\"application/vnd.vectorworks\":{\"source\":\"iana\"},\"application/vnd.vel+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.verimatrix.vcas\":{\"source\":\"iana\"},\"application/vnd.veryant.thin\":{\"source\":\"iana\"},\"application/vnd.ves.encrypted\":{\"source\":\"iana\"},\"application/vnd.vidsoft.vidconference\":{\"source\":\"iana\"},\"application/vnd.visio\":{\"source\":\"iana\",\"extensions\":[\"vsd\",\"vst\",\"vss\",\"vsw\"]},\"application/vnd.visionary\":{\"source\":\"iana\",\"extensions\":[\"vis\"]},\"application/vnd.vividence.scriptfile\":{\"source\":\"iana\"},\"application/vnd.vsf\":{\"source\":\"iana\",\"extensions\":[\"vsf\"]},\"application/vnd.wap.sic\":{\"source\":\"iana\"},\"application/vnd.wap.slc\":{\"source\":\"iana\"},\"application/vnd.wap.wbxml\":{\"source\":\"iana\",\"extensions\":[\"wbxml\"]},\"application/vnd.wap.wmlc\":{\"source\":\"iana\",\"extensions\":[\"wmlc\"]},\"application/vnd.wap.wmlscriptc\":{\"source\":\"iana\",\"extensions\":[\"wmlsc\"]},\"application/vnd.webturbo\":{\"source\":\"iana\",\"extensions\":[\"wtb\"]},\"application/vnd.wfa.p2p\":{\"source\":\"iana\"},\"application/vnd.wfa.wsc\":{\"source\":\"iana\"},\"application/vnd.windows.devicepairing\":{\"source\":\"iana\"},\"application/vnd.wmc\":{\"source\":\"iana\"},\"application/vnd.wmf.bootstrap\":{\"source\":\"iana\"},\"application/vnd.wolfram.mathematica\":{\"source\":\"iana\"},\"application/vnd.wolfram.mathematica.package\":{\"source\":\"iana\"},\"application/vnd.wolfram.player\":{\"source\":\"iana\",\"extensions\":[\"nbp\"]},\"application/vnd.wordperfect\":{\"source\":\"iana\",\"extensions\":[\"wpd\"]},\"application/vnd.wqd\":{\"source\":\"iana\",\"extensions\":[\"wqd\"]},\"application/vnd.wrq-hp3000-labelled\":{\"source\":\"iana\"},\"application/vnd.wt.stf\":{\"source\":\"iana\",\"extensions\":[\"stf\"]},\"application/vnd.wv.csp+wbxml\":{\"source\":\"iana\"},\"application/vnd.wv.csp+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.wv.ssp+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.xacml+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.xara\":{\"source\":\"iana\",\"extensions\":[\"xar\"]},\"application/vnd.xfdl\":{\"source\":\"iana\",\"extensions\":[\"xfdl\"]},\"application/vnd.xfdl.webform\":{\"source\":\"iana\"},\"application/vnd.xmi+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/vnd.xmpie.cpkg\":{\"source\":\"iana\"},\"application/vnd.xmpie.dpkg\":{\"source\":\"iana\"},\"application/vnd.xmpie.plan\":{\"source\":\"iana\"},\"application/vnd.xmpie.ppkg\":{\"source\":\"iana\"},\"application/vnd.xmpie.xlim\":{\"source\":\"iana\"},\"application/vnd.yamaha.hv-dic\":{\"source\":\"iana\",\"extensions\":[\"hvd\"]},\"application/vnd.yamaha.hv-script\":{\"source\":\"iana\",\"extensions\":[\"hvs\"]},\"application/vnd.yamaha.hv-voice\":{\"source\":\"iana\",\"extensions\":[\"hvp\"]},\"application/vnd.yamaha.openscoreformat\":{\"source\":\"iana\",\"extensions\":[\"osf\"]},\"application/vnd.yamaha.openscoreformat.osfpvg+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"osfpvg\"]},\"application/vnd.yamaha.remote-setup\":{\"source\":\"iana\"},\"application/vnd.yamaha.smaf-audio\":{\"source\":\"iana\",\"extensions\":[\"saf\"]},\"application/vnd.yamaha.smaf-phrase\":{\"source\":\"iana\",\"extensions\":[\"spf\"]},\"application/vnd.yamaha.through-ngn\":{\"source\":\"iana\"},\"application/vnd.yamaha.tunnel-udpencap\":{\"source\":\"iana\"},\"application/vnd.yaoweme\":{\"source\":\"iana\"},\"application/vnd.yellowriver-custom-menu\":{\"source\":\"iana\",\"extensions\":[\"cmp\"]},\"application/vnd.youtube.yt\":{\"source\":\"iana\"},\"application/vnd.zul\":{\"source\":\"iana\",\"extensions\":[\"zir\",\"zirz\"]},\"application/vnd.zzazz.deck+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"zaz\"]},\"application/voicexml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"vxml\"]},\"application/voucher-cms+json\":{\"source\":\"iana\",\"compressible\":true},\"application/vq-rtcpxr\":{\"source\":\"iana\"},\"application/wasm\":{\"compressible\":true,\"extensions\":[\"wasm\"]},\"application/watcherinfo+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/webpush-options+json\":{\"source\":\"iana\",\"compressible\":true},\"application/whoispp-query\":{\"source\":\"iana\"},\"application/whoispp-response\":{\"source\":\"iana\"},\"application/widget\":{\"source\":\"iana\",\"extensions\":[\"wgt\"]},\"application/winhlp\":{\"source\":\"apache\",\"extensions\":[\"hlp\"]},\"application/wita\":{\"source\":\"iana\"},\"application/wordperfect5.1\":{\"source\":\"iana\"},\"application/wsdl+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"wsdl\"]},\"application/wspolicy+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"wspolicy\"]},\"application/x-7z-compressed\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"7z\"]},\"application/x-abiword\":{\"source\":\"apache\",\"extensions\":[\"abw\"]},\"application/x-ace-compressed\":{\"source\":\"apache\",\"extensions\":[\"ace\"]},\"application/x-amf\":{\"source\":\"apache\"},\"application/x-apple-diskimage\":{\"source\":\"apache\",\"extensions\":[\"dmg\"]},\"application/x-arj\":{\"compressible\":false,\"extensions\":[\"arj\"]},\"application/x-authorware-bin\":{\"source\":\"apache\",\"extensions\":[\"aab\",\"x32\",\"u32\",\"vox\"]},\"application/x-authorware-map\":{\"source\":\"apache\",\"extensions\":[\"aam\"]},\"application/x-authorware-seg\":{\"source\":\"apache\",\"extensions\":[\"aas\"]},\"application/x-bcpio\":{\"source\":\"apache\",\"extensions\":[\"bcpio\"]},\"application/x-bdoc\":{\"compressible\":false,\"extensions\":[\"bdoc\"]},\"application/x-bittorrent\":{\"source\":\"apache\",\"extensions\":[\"torrent\"]},\"application/x-blorb\":{\"source\":\"apache\",\"extensions\":[\"blb\",\"blorb\"]},\"application/x-bzip\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"bz\"]},\"application/x-bzip2\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"bz2\",\"boz\"]},\"application/x-cbr\":{\"source\":\"apache\",\"extensions\":[\"cbr\",\"cba\",\"cbt\",\"cbz\",\"cb7\"]},\"application/x-cdlink\":{\"source\":\"apache\",\"extensions\":[\"vcd\"]},\"application/x-cfs-compressed\":{\"source\":\"apache\",\"extensions\":[\"cfs\"]},\"application/x-chat\":{\"source\":\"apache\",\"extensions\":[\"chat\"]},\"application/x-chess-pgn\":{\"source\":\"apache\",\"extensions\":[\"pgn\"]},\"application/x-chrome-extension\":{\"extensions\":[\"crx\"]},\"application/x-cocoa\":{\"source\":\"nginx\",\"extensions\":[\"cco\"]},\"application/x-compress\":{\"source\":\"apache\"},\"application/x-conference\":{\"source\":\"apache\",\"extensions\":[\"nsc\"]},\"application/x-cpio\":{\"source\":\"apache\",\"extensions\":[\"cpio\"]},\"application/x-csh\":{\"source\":\"apache\",\"extensions\":[\"csh\"]},\"application/x-deb\":{\"compressible\":false},\"application/x-debian-package\":{\"source\":\"apache\",\"extensions\":[\"deb\",\"udeb\"]},\"application/x-dgc-compressed\":{\"source\":\"apache\",\"extensions\":[\"dgc\"]},\"application/x-director\":{\"source\":\"apache\",\"extensions\":[\"dir\",\"dcr\",\"dxr\",\"cst\",\"cct\",\"cxt\",\"w3d\",\"fgd\",\"swa\"]},\"application/x-doom\":{\"source\":\"apache\",\"extensions\":[\"wad\"]},\"application/x-dtbncx+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"ncx\"]},\"application/x-dtbook+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"dtb\"]},\"application/x-dtbresource+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"res\"]},\"application/x-dvi\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"dvi\"]},\"application/x-envoy\":{\"source\":\"apache\",\"extensions\":[\"evy\"]},\"application/x-eva\":{\"source\":\"apache\",\"extensions\":[\"eva\"]},\"application/x-font-bdf\":{\"source\":\"apache\",\"extensions\":[\"bdf\"]},\"application/x-font-dos\":{\"source\":\"apache\"},\"application/x-font-framemaker\":{\"source\":\"apache\"},\"application/x-font-ghostscript\":{\"source\":\"apache\",\"extensions\":[\"gsf\"]},\"application/x-font-libgrx\":{\"source\":\"apache\"},\"application/x-font-linux-psf\":{\"source\":\"apache\",\"extensions\":[\"psf\"]},\"application/x-font-pcf\":{\"source\":\"apache\",\"extensions\":[\"pcf\"]},\"application/x-font-snf\":{\"source\":\"apache\",\"extensions\":[\"snf\"]},\"application/x-font-speedo\":{\"source\":\"apache\"},\"application/x-font-sunos-news\":{\"source\":\"apache\"},\"application/x-font-type1\":{\"source\":\"apache\",\"extensions\":[\"pfa\",\"pfb\",\"pfm\",\"afm\"]},\"application/x-font-vfont\":{\"source\":\"apache\"},\"application/x-freearc\":{\"source\":\"apache\",\"extensions\":[\"arc\"]},\"application/x-futuresplash\":{\"source\":\"apache\",\"extensions\":[\"spl\"]},\"application/x-gca-compressed\":{\"source\":\"apache\",\"extensions\":[\"gca\"]},\"application/x-glulx\":{\"source\":\"apache\",\"extensions\":[\"ulx\"]},\"application/x-gnumeric\":{\"source\":\"apache\",\"extensions\":[\"gnumeric\"]},\"application/x-gramps-xml\":{\"source\":\"apache\",\"extensions\":[\"gramps\"]},\"application/x-gtar\":{\"source\":\"apache\",\"extensions\":[\"gtar\"]},\"application/x-gzip\":{\"source\":\"apache\"},\"application/x-hdf\":{\"source\":\"apache\",\"extensions\":[\"hdf\"]},\"application/x-httpd-php\":{\"compressible\":true,\"extensions\":[\"php\"]},\"application/x-install-instructions\":{\"source\":\"apache\",\"extensions\":[\"install\"]},\"application/x-iso9660-image\":{\"source\":\"apache\",\"extensions\":[\"iso\"]},\"application/x-java-archive-diff\":{\"source\":\"nginx\",\"extensions\":[\"jardiff\"]},\"application/x-java-jnlp-file\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"jnlp\"]},\"application/x-javascript\":{\"compressible\":true},\"application/x-latex\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"latex\"]},\"application/x-lua-bytecode\":{\"extensions\":[\"luac\"]},\"application/x-lzh-compressed\":{\"source\":\"apache\",\"extensions\":[\"lzh\",\"lha\"]},\"application/x-makeself\":{\"source\":\"nginx\",\"extensions\":[\"run\"]},\"application/x-mie\":{\"source\":\"apache\",\"extensions\":[\"mie\"]},\"application/x-mobipocket-ebook\":{\"source\":\"apache\",\"extensions\":[\"prc\",\"mobi\"]},\"application/x-mpegurl\":{\"compressible\":false},\"application/x-ms-application\":{\"source\":\"apache\",\"extensions\":[\"application\"]},\"application/x-ms-shortcut\":{\"source\":\"apache\",\"extensions\":[\"lnk\"]},\"application/x-ms-wmd\":{\"source\":\"apache\",\"extensions\":[\"wmd\"]},\"application/x-ms-wmz\":{\"source\":\"apache\",\"extensions\":[\"wmz\"]},\"application/x-ms-xbap\":{\"source\":\"apache\",\"extensions\":[\"xbap\"]},\"application/x-msaccess\":{\"source\":\"apache\",\"extensions\":[\"mdb\"]},\"application/x-msbinder\":{\"source\":\"apache\",\"extensions\":[\"obd\"]},\"application/x-mscardfile\":{\"source\":\"apache\",\"extensions\":[\"crd\"]},\"application/x-msclip\":{\"source\":\"apache\",\"extensions\":[\"clp\"]},\"application/x-msdos-program\":{\"extensions\":[\"exe\"]},\"application/x-msdownload\":{\"source\":\"apache\",\"extensions\":[\"exe\",\"dll\",\"com\",\"bat\",\"msi\"]},\"application/x-msmediaview\":{\"source\":\"apache\",\"extensions\":[\"mvb\",\"m13\",\"m14\"]},\"application/x-msmetafile\":{\"source\":\"apache\",\"extensions\":[\"wmf\",\"wmz\",\"emf\",\"emz\"]},\"application/x-msmoney\":{\"source\":\"apache\",\"extensions\":[\"mny\"]},\"application/x-mspublisher\":{\"source\":\"apache\",\"extensions\":[\"pub\"]},\"application/x-msschedule\":{\"source\":\"apache\",\"extensions\":[\"scd\"]},\"application/x-msterminal\":{\"source\":\"apache\",\"extensions\":[\"trm\"]},\"application/x-mswrite\":{\"source\":\"apache\",\"extensions\":[\"wri\"]},\"application/x-netcdf\":{\"source\":\"apache\",\"extensions\":[\"nc\",\"cdf\"]},\"application/x-ns-proxy-autoconfig\":{\"compressible\":true,\"extensions\":[\"pac\"]},\"application/x-nzb\":{\"source\":\"apache\",\"extensions\":[\"nzb\"]},\"application/x-perl\":{\"source\":\"nginx\",\"extensions\":[\"pl\",\"pm\"]},\"application/x-pilot\":{\"source\":\"nginx\",\"extensions\":[\"prc\",\"pdb\"]},\"application/x-pkcs12\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"p12\",\"pfx\"]},\"application/x-pkcs7-certificates\":{\"source\":\"apache\",\"extensions\":[\"p7b\",\"spc\"]},\"application/x-pkcs7-certreqresp\":{\"source\":\"apache\",\"extensions\":[\"p7r\"]},\"application/x-rar-compressed\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"rar\"]},\"application/x-redhat-package-manager\":{\"source\":\"nginx\",\"extensions\":[\"rpm\"]},\"application/x-research-info-systems\":{\"source\":\"apache\",\"extensions\":[\"ris\"]},\"application/x-sea\":{\"source\":\"nginx\",\"extensions\":[\"sea\"]},\"application/x-sh\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"sh\"]},\"application/x-shar\":{\"source\":\"apache\",\"extensions\":[\"shar\"]},\"application/x-shockwave-flash\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"swf\"]},\"application/x-silverlight-app\":{\"source\":\"apache\",\"extensions\":[\"xap\"]},\"application/x-sql\":{\"source\":\"apache\",\"extensions\":[\"sql\"]},\"application/x-stuffit\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"sit\"]},\"application/x-stuffitx\":{\"source\":\"apache\",\"extensions\":[\"sitx\"]},\"application/x-subrip\":{\"source\":\"apache\",\"extensions\":[\"srt\"]},\"application/x-sv4cpio\":{\"source\":\"apache\",\"extensions\":[\"sv4cpio\"]},\"application/x-sv4crc\":{\"source\":\"apache\",\"extensions\":[\"sv4crc\"]},\"application/x-t3vm-image\":{\"source\":\"apache\",\"extensions\":[\"t3\"]},\"application/x-tads\":{\"source\":\"apache\",\"extensions\":[\"gam\"]},\"application/x-tar\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"tar\"]},\"application/x-tcl\":{\"source\":\"apache\",\"extensions\":[\"tcl\",\"tk\"]},\"application/x-tex\":{\"source\":\"apache\",\"extensions\":[\"tex\"]},\"application/x-tex-tfm\":{\"source\":\"apache\",\"extensions\":[\"tfm\"]},\"application/x-texinfo\":{\"source\":\"apache\",\"extensions\":[\"texinfo\",\"texi\"]},\"application/x-tgif\":{\"source\":\"apache\",\"extensions\":[\"obj\"]},\"application/x-ustar\":{\"source\":\"apache\",\"extensions\":[\"ustar\"]},\"application/x-virtualbox-hdd\":{\"compressible\":true,\"extensions\":[\"hdd\"]},\"application/x-virtualbox-ova\":{\"compressible\":true,\"extensions\":[\"ova\"]},\"application/x-virtualbox-ovf\":{\"compressible\":true,\"extensions\":[\"ovf\"]},\"application/x-virtualbox-vbox\":{\"compressible\":true,\"extensions\":[\"vbox\"]},\"application/x-virtualbox-vbox-extpack\":{\"compressible\":false,\"extensions\":[\"vbox-extpack\"]},\"application/x-virtualbox-vdi\":{\"compressible\":true,\"extensions\":[\"vdi\"]},\"application/x-virtualbox-vhd\":{\"compressible\":true,\"extensions\":[\"vhd\"]},\"application/x-virtualbox-vmdk\":{\"compressible\":true,\"extensions\":[\"vmdk\"]},\"application/x-wais-source\":{\"source\":\"apache\",\"extensions\":[\"src\"]},\"application/x-web-app-manifest+json\":{\"compressible\":true,\"extensions\":[\"webapp\"]},\"application/x-www-form-urlencoded\":{\"source\":\"iana\",\"compressible\":true},\"application/x-x509-ca-cert\":{\"source\":\"apache\",\"extensions\":[\"der\",\"crt\",\"pem\"]},\"application/x-xfig\":{\"source\":\"apache\",\"extensions\":[\"fig\"]},\"application/x-xliff+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"xlf\"]},\"application/x-xpinstall\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"xpi\"]},\"application/x-xz\":{\"source\":\"apache\",\"extensions\":[\"xz\"]},\"application/x-zmachine\":{\"source\":\"apache\",\"extensions\":[\"z1\",\"z2\",\"z3\",\"z4\",\"z5\",\"z6\",\"z7\",\"z8\"]},\"application/x400-bp\":{\"source\":\"iana\"},\"application/xacml+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xaml+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"xaml\"]},\"application/xcap-att+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xcap-caps+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xcap-diff+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xdf\"]},\"application/xcap-el+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xcap-error+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xcap-ns+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xcon-conference-info+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xcon-conference-info-diff+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xenc+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xenc\"]},\"application/xhtml+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xhtml\",\"xht\"]},\"application/xhtml-voice+xml\":{\"source\":\"apache\",\"compressible\":true},\"application/xliff+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xml\",\"xsl\",\"xsd\",\"rng\"]},\"application/xml-dtd\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"dtd\"]},\"application/xml-external-parsed-entity\":{\"source\":\"iana\"},\"application/xml-patch+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xmpp+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/xop+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xop\"]},\"application/xproc+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"xpl\"]},\"application/xslt+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xslt\"]},\"application/xspf+xml\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"xspf\"]},\"application/xv+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"mxml\",\"xhvml\",\"xvml\",\"xvm\"]},\"application/yang\":{\"source\":\"iana\",\"extensions\":[\"yang\"]},\"application/yang-data+json\":{\"source\":\"iana\",\"compressible\":true},\"application/yang-data+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/yang-patch+json\":{\"source\":\"iana\",\"compressible\":true},\"application/yang-patch+xml\":{\"source\":\"iana\",\"compressible\":true},\"application/yin+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"yin\"]},\"application/zip\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"zip\"]},\"application/zlib\":{\"source\":\"iana\"},\"application/zstd\":{\"source\":\"iana\"},\"audio/1d-interleaved-parityfec\":{\"source\":\"iana\"},\"audio/32kadpcm\":{\"source\":\"iana\"},\"audio/3gpp\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"3gpp\"]},\"audio/3gpp2\":{\"source\":\"iana\"},\"audio/aac\":{\"source\":\"iana\"},\"audio/ac3\":{\"source\":\"iana\"},\"audio/adpcm\":{\"source\":\"apache\",\"extensions\":[\"adp\"]},\"audio/amr\":{\"source\":\"iana\"},\"audio/amr-wb\":{\"source\":\"iana\"},\"audio/amr-wb+\":{\"source\":\"iana\"},\"audio/aptx\":{\"source\":\"iana\"},\"audio/asc\":{\"source\":\"iana\"},\"audio/atrac-advanced-lossless\":{\"source\":\"iana\"},\"audio/atrac-x\":{\"source\":\"iana\"},\"audio/atrac3\":{\"source\":\"iana\"},\"audio/basic\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"au\",\"snd\"]},\"audio/bv16\":{\"source\":\"iana\"},\"audio/bv32\":{\"source\":\"iana\"},\"audio/clearmode\":{\"source\":\"iana\"},\"audio/cn\":{\"source\":\"iana\"},\"audio/dat12\":{\"source\":\"iana\"},\"audio/dls\":{\"source\":\"iana\"},\"audio/dsr-es201108\":{\"source\":\"iana\"},\"audio/dsr-es202050\":{\"source\":\"iana\"},\"audio/dsr-es202211\":{\"source\":\"iana\"},\"audio/dsr-es202212\":{\"source\":\"iana\"},\"audio/dv\":{\"source\":\"iana\"},\"audio/dvi4\":{\"source\":\"iana\"},\"audio/eac3\":{\"source\":\"iana\"},\"audio/encaprtp\":{\"source\":\"iana\"},\"audio/evrc\":{\"source\":\"iana\"},\"audio/evrc-qcp\":{\"source\":\"iana\"},\"audio/evrc0\":{\"source\":\"iana\"},\"audio/evrc1\":{\"source\":\"iana\"},\"audio/evrcb\":{\"source\":\"iana\"},\"audio/evrcb0\":{\"source\":\"iana\"},\"audio/evrcb1\":{\"source\":\"iana\"},\"audio/evrcnw\":{\"source\":\"iana\"},\"audio/evrcnw0\":{\"source\":\"iana\"},\"audio/evrcnw1\":{\"source\":\"iana\"},\"audio/evrcwb\":{\"source\":\"iana\"},\"audio/evrcwb0\":{\"source\":\"iana\"},\"audio/evrcwb1\":{\"source\":\"iana\"},\"audio/evs\":{\"source\":\"iana\"},\"audio/flexfec\":{\"source\":\"iana\"},\"audio/fwdred\":{\"source\":\"iana\"},\"audio/g711-0\":{\"source\":\"iana\"},\"audio/g719\":{\"source\":\"iana\"},\"audio/g722\":{\"source\":\"iana\"},\"audio/g7221\":{\"source\":\"iana\"},\"audio/g723\":{\"source\":\"iana\"},\"audio/g726-16\":{\"source\":\"iana\"},\"audio/g726-24\":{\"source\":\"iana\"},\"audio/g726-32\":{\"source\":\"iana\"},\"audio/g726-40\":{\"source\":\"iana\"},\"audio/g728\":{\"source\":\"iana\"},\"audio/g729\":{\"source\":\"iana\"},\"audio/g7291\":{\"source\":\"iana\"},\"audio/g729d\":{\"source\":\"iana\"},\"audio/g729e\":{\"source\":\"iana\"},\"audio/gsm\":{\"source\":\"iana\"},\"audio/gsm-efr\":{\"source\":\"iana\"},\"audio/gsm-hr-08\":{\"source\":\"iana\"},\"audio/ilbc\":{\"source\":\"iana\"},\"audio/ip-mr_v2.5\":{\"source\":\"iana\"},\"audio/isac\":{\"source\":\"apache\"},\"audio/l16\":{\"source\":\"iana\"},\"audio/l20\":{\"source\":\"iana\"},\"audio/l24\":{\"source\":\"iana\",\"compressible\":false},\"audio/l8\":{\"source\":\"iana\"},\"audio/lpc\":{\"source\":\"iana\"},\"audio/melp\":{\"source\":\"iana\"},\"audio/melp1200\":{\"source\":\"iana\"},\"audio/melp2400\":{\"source\":\"iana\"},\"audio/melp600\":{\"source\":\"iana\"},\"audio/midi\":{\"source\":\"apache\",\"extensions\":[\"mid\",\"midi\",\"kar\",\"rmi\"]},\"audio/mobile-xmf\":{\"source\":\"iana\"},\"audio/mp3\":{\"compressible\":false,\"extensions\":[\"mp3\"]},\"audio/mp4\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"m4a\",\"mp4a\"]},\"audio/mp4a-latm\":{\"source\":\"iana\"},\"audio/mpa\":{\"source\":\"iana\"},\"audio/mpa-robust\":{\"source\":\"iana\"},\"audio/mpeg\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"mpga\",\"mp2\",\"mp2a\",\"mp3\",\"m2a\",\"m3a\"]},\"audio/mpeg4-generic\":{\"source\":\"iana\"},\"audio/musepack\":{\"source\":\"apache\"},\"audio/ogg\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"oga\",\"ogg\",\"spx\"]},\"audio/opus\":{\"source\":\"iana\"},\"audio/parityfec\":{\"source\":\"iana\"},\"audio/pcma\":{\"source\":\"iana\"},\"audio/pcma-wb\":{\"source\":\"iana\"},\"audio/pcmu\":{\"source\":\"iana\"},\"audio/pcmu-wb\":{\"source\":\"iana\"},\"audio/prs.sid\":{\"source\":\"iana\"},\"audio/qcelp\":{\"source\":\"iana\"},\"audio/raptorfec\":{\"source\":\"iana\"},\"audio/red\":{\"source\":\"iana\"},\"audio/rtp-enc-aescm128\":{\"source\":\"iana\"},\"audio/rtp-midi\":{\"source\":\"iana\"},\"audio/rtploopback\":{\"source\":\"iana\"},\"audio/rtx\":{\"source\":\"iana\"},\"audio/s3m\":{\"source\":\"apache\",\"extensions\":[\"s3m\"]},\"audio/silk\":{\"source\":\"apache\",\"extensions\":[\"sil\"]},\"audio/smv\":{\"source\":\"iana\"},\"audio/smv-qcp\":{\"source\":\"iana\"},\"audio/smv0\":{\"source\":\"iana\"},\"audio/sp-midi\":{\"source\":\"iana\"},\"audio/speex\":{\"source\":\"iana\"},\"audio/t140c\":{\"source\":\"iana\"},\"audio/t38\":{\"source\":\"iana\"},\"audio/telephone-event\":{\"source\":\"iana\"},\"audio/tetra_acelp\":{\"source\":\"iana\"},\"audio/tone\":{\"source\":\"iana\"},\"audio/uemclip\":{\"source\":\"iana\"},\"audio/ulpfec\":{\"source\":\"iana\"},\"audio/usac\":{\"source\":\"iana\"},\"audio/vdvi\":{\"source\":\"iana\"},\"audio/vmr-wb\":{\"source\":\"iana\"},\"audio/vnd.3gpp.iufp\":{\"source\":\"iana\"},\"audio/vnd.4sb\":{\"source\":\"iana\"},\"audio/vnd.audiokoz\":{\"source\":\"iana\"},\"audio/vnd.celp\":{\"source\":\"iana\"},\"audio/vnd.cisco.nse\":{\"source\":\"iana\"},\"audio/vnd.cmles.radio-events\":{\"source\":\"iana\"},\"audio/vnd.cns.anp1\":{\"source\":\"iana\"},\"audio/vnd.cns.inf1\":{\"source\":\"iana\"},\"audio/vnd.dece.audio\":{\"source\":\"iana\",\"extensions\":[\"uva\",\"uvva\"]},\"audio/vnd.digital-winds\":{\"source\":\"iana\",\"extensions\":[\"eol\"]},\"audio/vnd.dlna.adts\":{\"source\":\"iana\"},\"audio/vnd.dolby.heaac.1\":{\"source\":\"iana\"},\"audio/vnd.dolby.heaac.2\":{\"source\":\"iana\"},\"audio/vnd.dolby.mlp\":{\"source\":\"iana\"},\"audio/vnd.dolby.mps\":{\"source\":\"iana\"},\"audio/vnd.dolby.pl2\":{\"source\":\"iana\"},\"audio/vnd.dolby.pl2x\":{\"source\":\"iana\"},\"audio/vnd.dolby.pl2z\":{\"source\":\"iana\"},\"audio/vnd.dolby.pulse.1\":{\"source\":\"iana\"},\"audio/vnd.dra\":{\"source\":\"iana\",\"extensions\":[\"dra\"]},\"audio/vnd.dts\":{\"source\":\"iana\",\"extensions\":[\"dts\"]},\"audio/vnd.dts.hd\":{\"source\":\"iana\",\"extensions\":[\"dtshd\"]},\"audio/vnd.dts.uhd\":{\"source\":\"iana\"},\"audio/vnd.dvb.file\":{\"source\":\"iana\"},\"audio/vnd.everad.plj\":{\"source\":\"iana\"},\"audio/vnd.hns.audio\":{\"source\":\"iana\"},\"audio/vnd.lucent.voice\":{\"source\":\"iana\",\"extensions\":[\"lvp\"]},\"audio/vnd.ms-playready.media.pya\":{\"source\":\"iana\",\"extensions\":[\"pya\"]},\"audio/vnd.nokia.mobile-xmf\":{\"source\":\"iana\"},\"audio/vnd.nortel.vbk\":{\"source\":\"iana\"},\"audio/vnd.nuera.ecelp4800\":{\"source\":\"iana\",\"extensions\":[\"ecelp4800\"]},\"audio/vnd.nuera.ecelp7470\":{\"source\":\"iana\",\"extensions\":[\"ecelp7470\"]},\"audio/vnd.nuera.ecelp9600\":{\"source\":\"iana\",\"extensions\":[\"ecelp9600\"]},\"audio/vnd.octel.sbc\":{\"source\":\"iana\"},\"audio/vnd.presonus.multitrack\":{\"source\":\"iana\"},\"audio/vnd.qcelp\":{\"source\":\"iana\"},\"audio/vnd.rhetorex.32kadpcm\":{\"source\":\"iana\"},\"audio/vnd.rip\":{\"source\":\"iana\",\"extensions\":[\"rip\"]},\"audio/vnd.rn-realaudio\":{\"compressible\":false},\"audio/vnd.sealedmedia.softseal.mpeg\":{\"source\":\"iana\"},\"audio/vnd.vmx.cvsd\":{\"source\":\"iana\"},\"audio/vnd.wave\":{\"compressible\":false},\"audio/vorbis\":{\"source\":\"iana\",\"compressible\":false},\"audio/vorbis-config\":{\"source\":\"iana\"},\"audio/wav\":{\"compressible\":false,\"extensions\":[\"wav\"]},\"audio/wave\":{\"compressible\":false,\"extensions\":[\"wav\"]},\"audio/webm\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"weba\"]},\"audio/x-aac\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"aac\"]},\"audio/x-aiff\":{\"source\":\"apache\",\"extensions\":[\"aif\",\"aiff\",\"aifc\"]},\"audio/x-caf\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"caf\"]},\"audio/x-flac\":{\"source\":\"apache\",\"extensions\":[\"flac\"]},\"audio/x-m4a\":{\"source\":\"nginx\",\"extensions\":[\"m4a\"]},\"audio/x-matroska\":{\"source\":\"apache\",\"extensions\":[\"mka\"]},\"audio/x-mpegurl\":{\"source\":\"apache\",\"extensions\":[\"m3u\"]},\"audio/x-ms-wax\":{\"source\":\"apache\",\"extensions\":[\"wax\"]},\"audio/x-ms-wma\":{\"source\":\"apache\",\"extensions\":[\"wma\"]},\"audio/x-pn-realaudio\":{\"source\":\"apache\",\"extensions\":[\"ram\",\"ra\"]},\"audio/x-pn-realaudio-plugin\":{\"source\":\"apache\",\"extensions\":[\"rmp\"]},\"audio/x-realaudio\":{\"source\":\"nginx\",\"extensions\":[\"ra\"]},\"audio/x-tta\":{\"source\":\"apache\"},\"audio/x-wav\":{\"source\":\"apache\",\"extensions\":[\"wav\"]},\"audio/xm\":{\"source\":\"apache\",\"extensions\":[\"xm\"]},\"chemical/x-cdx\":{\"source\":\"apache\",\"extensions\":[\"cdx\"]},\"chemical/x-cif\":{\"source\":\"apache\",\"extensions\":[\"cif\"]},\"chemical/x-cmdf\":{\"source\":\"apache\",\"extensions\":[\"cmdf\"]},\"chemical/x-cml\":{\"source\":\"apache\",\"extensions\":[\"cml\"]},\"chemical/x-csml\":{\"source\":\"apache\",\"extensions\":[\"csml\"]},\"chemical/x-pdb\":{\"source\":\"apache\"},\"chemical/x-xyz\":{\"source\":\"apache\",\"extensions\":[\"xyz\"]},\"font/collection\":{\"source\":\"iana\",\"extensions\":[\"ttc\"]},\"font/otf\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"otf\"]},\"font/sfnt\":{\"source\":\"iana\"},\"font/ttf\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"ttf\"]},\"font/woff\":{\"source\":\"iana\",\"extensions\":[\"woff\"]},\"font/woff2\":{\"source\":\"iana\",\"extensions\":[\"woff2\"]},\"image/aces\":{\"source\":\"iana\",\"extensions\":[\"exr\"]},\"image/apng\":{\"compressible\":false,\"extensions\":[\"apng\"]},\"image/avci\":{\"source\":\"iana\"},\"image/avcs\":{\"source\":\"iana\"},\"image/bmp\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"bmp\"]},\"image/cgm\":{\"source\":\"iana\",\"extensions\":[\"cgm\"]},\"image/dicom-rle\":{\"source\":\"iana\",\"extensions\":[\"drle\"]},\"image/emf\":{\"source\":\"iana\",\"extensions\":[\"emf\"]},\"image/fits\":{\"source\":\"iana\",\"extensions\":[\"fits\"]},\"image/g3fax\":{\"source\":\"iana\",\"extensions\":[\"g3\"]},\"image/gif\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"gif\"]},\"image/heic\":{\"source\":\"iana\",\"extensions\":[\"heic\"]},\"image/heic-sequence\":{\"source\":\"iana\",\"extensions\":[\"heics\"]},\"image/heif\":{\"source\":\"iana\",\"extensions\":[\"heif\"]},\"image/heif-sequence\":{\"source\":\"iana\",\"extensions\":[\"heifs\"]},\"image/hej2k\":{\"source\":\"iana\",\"extensions\":[\"hej2\"]},\"image/hsj2\":{\"source\":\"iana\",\"extensions\":[\"hsj2\"]},\"image/ief\":{\"source\":\"iana\",\"extensions\":[\"ief\"]},\"image/jls\":{\"source\":\"iana\",\"extensions\":[\"jls\"]},\"image/jp2\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"jp2\",\"jpg2\"]},\"image/jpeg\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"jpeg\",\"jpg\",\"jpe\"]},\"image/jph\":{\"source\":\"iana\",\"extensions\":[\"jph\"]},\"image/jphc\":{\"source\":\"iana\",\"extensions\":[\"jhc\"]},\"image/jpm\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"jpm\"]},\"image/jpx\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"jpx\",\"jpf\"]},\"image/jxr\":{\"source\":\"iana\",\"extensions\":[\"jxr\"]},\"image/jxra\":{\"source\":\"iana\",\"extensions\":[\"jxra\"]},\"image/jxrs\":{\"source\":\"iana\",\"extensions\":[\"jxrs\"]},\"image/jxs\":{\"source\":\"iana\",\"extensions\":[\"jxs\"]},\"image/jxsc\":{\"source\":\"iana\",\"extensions\":[\"jxsc\"]},\"image/jxsi\":{\"source\":\"iana\",\"extensions\":[\"jxsi\"]},\"image/jxss\":{\"source\":\"iana\",\"extensions\":[\"jxss\"]},\"image/ktx\":{\"source\":\"iana\",\"extensions\":[\"ktx\"]},\"image/naplps\":{\"source\":\"iana\"},\"image/pjpeg\":{\"compressible\":false},\"image/png\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"png\"]},\"image/prs.btif\":{\"source\":\"iana\",\"extensions\":[\"btif\"]},\"image/prs.pti\":{\"source\":\"iana\",\"extensions\":[\"pti\"]},\"image/pwg-raster\":{\"source\":\"iana\"},\"image/sgi\":{\"source\":\"apache\",\"extensions\":[\"sgi\"]},\"image/svg+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"svg\",\"svgz\"]},\"image/t38\":{\"source\":\"iana\",\"extensions\":[\"t38\"]},\"image/tiff\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"tif\",\"tiff\"]},\"image/tiff-fx\":{\"source\":\"iana\",\"extensions\":[\"tfx\"]},\"image/vnd.adobe.photoshop\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"psd\"]},\"image/vnd.airzip.accelerator.azv\":{\"source\":\"iana\",\"extensions\":[\"azv\"]},\"image/vnd.cns.inf2\":{\"source\":\"iana\"},\"image/vnd.dece.graphic\":{\"source\":\"iana\",\"extensions\":[\"uvi\",\"uvvi\",\"uvg\",\"uvvg\"]},\"image/vnd.djvu\":{\"source\":\"iana\",\"extensions\":[\"djvu\",\"djv\"]},\"image/vnd.dvb.subtitle\":{\"source\":\"iana\",\"extensions\":[\"sub\"]},\"image/vnd.dwg\":{\"source\":\"iana\",\"extensions\":[\"dwg\"]},\"image/vnd.dxf\":{\"source\":\"iana\",\"extensions\":[\"dxf\"]},\"image/vnd.fastbidsheet\":{\"source\":\"iana\",\"extensions\":[\"fbs\"]},\"image/vnd.fpx\":{\"source\":\"iana\",\"extensions\":[\"fpx\"]},\"image/vnd.fst\":{\"source\":\"iana\",\"extensions\":[\"fst\"]},\"image/vnd.fujixerox.edmics-mmr\":{\"source\":\"iana\",\"extensions\":[\"mmr\"]},\"image/vnd.fujixerox.edmics-rlc\":{\"source\":\"iana\",\"extensions\":[\"rlc\"]},\"image/vnd.globalgraphics.pgb\":{\"source\":\"iana\"},\"image/vnd.microsoft.icon\":{\"source\":\"iana\",\"extensions\":[\"ico\"]},\"image/vnd.mix\":{\"source\":\"iana\"},\"image/vnd.mozilla.apng\":{\"source\":\"iana\"},\"image/vnd.ms-dds\":{\"extensions\":[\"dds\"]},\"image/vnd.ms-modi\":{\"source\":\"iana\",\"extensions\":[\"mdi\"]},\"image/vnd.ms-photo\":{\"source\":\"apache\",\"extensions\":[\"wdp\"]},\"image/vnd.net-fpx\":{\"source\":\"iana\",\"extensions\":[\"npx\"]},\"image/vnd.radiance\":{\"source\":\"iana\"},\"image/vnd.sealed.png\":{\"source\":\"iana\"},\"image/vnd.sealedmedia.softseal.gif\":{\"source\":\"iana\"},\"image/vnd.sealedmedia.softseal.jpg\":{\"source\":\"iana\"},\"image/vnd.svf\":{\"source\":\"iana\"},\"image/vnd.tencent.tap\":{\"source\":\"iana\",\"extensions\":[\"tap\"]},\"image/vnd.valve.source.texture\":{\"source\":\"iana\",\"extensions\":[\"vtf\"]},\"image/vnd.wap.wbmp\":{\"source\":\"iana\",\"extensions\":[\"wbmp\"]},\"image/vnd.xiff\":{\"source\":\"iana\",\"extensions\":[\"xif\"]},\"image/vnd.zbrush.pcx\":{\"source\":\"iana\",\"extensions\":[\"pcx\"]},\"image/webp\":{\"source\":\"apache\",\"extensions\":[\"webp\"]},\"image/wmf\":{\"source\":\"iana\",\"extensions\":[\"wmf\"]},\"image/x-3ds\":{\"source\":\"apache\",\"extensions\":[\"3ds\"]},\"image/x-cmu-raster\":{\"source\":\"apache\",\"extensions\":[\"ras\"]},\"image/x-cmx\":{\"source\":\"apache\",\"extensions\":[\"cmx\"]},\"image/x-freehand\":{\"source\":\"apache\",\"extensions\":[\"fh\",\"fhc\",\"fh4\",\"fh5\",\"fh7\"]},\"image/x-icon\":{\"source\":\"apache\",\"compressible\":true,\"extensions\":[\"ico\"]},\"image/x-jng\":{\"source\":\"nginx\",\"extensions\":[\"jng\"]},\"image/x-mrsid-image\":{\"source\":\"apache\",\"extensions\":[\"sid\"]},\"image/x-ms-bmp\":{\"source\":\"nginx\",\"compressible\":true,\"extensions\":[\"bmp\"]},\"image/x-pcx\":{\"source\":\"apache\",\"extensions\":[\"pcx\"]},\"image/x-pict\":{\"source\":\"apache\",\"extensions\":[\"pic\",\"pct\"]},\"image/x-portable-anymap\":{\"source\":\"apache\",\"extensions\":[\"pnm\"]},\"image/x-portable-bitmap\":{\"source\":\"apache\",\"extensions\":[\"pbm\"]},\"image/x-portable-graymap\":{\"source\":\"apache\",\"extensions\":[\"pgm\"]},\"image/x-portable-pixmap\":{\"source\":\"apache\",\"extensions\":[\"ppm\"]},\"image/x-rgb\":{\"source\":\"apache\",\"extensions\":[\"rgb\"]},\"image/x-tga\":{\"source\":\"apache\",\"extensions\":[\"tga\"]},\"image/x-xbitmap\":{\"source\":\"apache\",\"extensions\":[\"xbm\"]},\"image/x-xcf\":{\"compressible\":false},\"image/x-xpixmap\":{\"source\":\"apache\",\"extensions\":[\"xpm\"]},\"image/x-xwindowdump\":{\"source\":\"apache\",\"extensions\":[\"xwd\"]},\"message/cpim\":{\"source\":\"iana\"},\"message/delivery-status\":{\"source\":\"iana\"},\"message/disposition-notification\":{\"source\":\"iana\",\"extensions\":[\"disposition-notification\"]},\"message/external-body\":{\"source\":\"iana\"},\"message/feedback-report\":{\"source\":\"iana\"},\"message/global\":{\"source\":\"iana\",\"extensions\":[\"u8msg\"]},\"message/global-delivery-status\":{\"source\":\"iana\",\"extensions\":[\"u8dsn\"]},\"message/global-disposition-notification\":{\"source\":\"iana\",\"extensions\":[\"u8mdn\"]},\"message/global-headers\":{\"source\":\"iana\",\"extensions\":[\"u8hdr\"]},\"message/http\":{\"source\":\"iana\",\"compressible\":false},\"message/imdn+xml\":{\"source\":\"iana\",\"compressible\":true},\"message/news\":{\"source\":\"iana\"},\"message/partial\":{\"source\":\"iana\",\"compressible\":false},\"message/rfc822\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"eml\",\"mime\"]},\"message/s-http\":{\"source\":\"iana\"},\"message/sip\":{\"source\":\"iana\"},\"message/sipfrag\":{\"source\":\"iana\"},\"message/tracking-status\":{\"source\":\"iana\"},\"message/vnd.si.simp\":{\"source\":\"iana\"},\"message/vnd.wfa.wsc\":{\"source\":\"iana\",\"extensions\":[\"wsc\"]},\"model/3mf\":{\"source\":\"iana\",\"extensions\":[\"3mf\"]},\"model/gltf+json\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"gltf\"]},\"model/gltf-binary\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"glb\"]},\"model/iges\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"igs\",\"iges\"]},\"model/mesh\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"msh\",\"mesh\",\"silo\"]},\"model/stl\":{\"source\":\"iana\",\"extensions\":[\"stl\"]},\"model/vnd.collada+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"dae\"]},\"model/vnd.dwf\":{\"source\":\"iana\",\"extensions\":[\"dwf\"]},\"model/vnd.flatland.3dml\":{\"source\":\"iana\"},\"model/vnd.gdl\":{\"source\":\"iana\",\"extensions\":[\"gdl\"]},\"model/vnd.gs-gdl\":{\"source\":\"apache\"},\"model/vnd.gs.gdl\":{\"source\":\"iana\"},\"model/vnd.gtw\":{\"source\":\"iana\",\"extensions\":[\"gtw\"]},\"model/vnd.moml+xml\":{\"source\":\"iana\",\"compressible\":true},\"model/vnd.mts\":{\"source\":\"iana\",\"extensions\":[\"mts\"]},\"model/vnd.opengex\":{\"source\":\"iana\",\"extensions\":[\"ogex\"]},\"model/vnd.parasolid.transmit.binary\":{\"source\":\"iana\",\"extensions\":[\"x_b\"]},\"model/vnd.parasolid.transmit.text\":{\"source\":\"iana\",\"extensions\":[\"x_t\"]},\"model/vnd.rosette.annotated-data-model\":{\"source\":\"iana\"},\"model/vnd.usdz+zip\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"usdz\"]},\"model/vnd.valve.source.compiled-map\":{\"source\":\"iana\",\"extensions\":[\"bsp\"]},\"model/vnd.vtu\":{\"source\":\"iana\",\"extensions\":[\"vtu\"]},\"model/vrml\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"wrl\",\"vrml\"]},\"model/x3d+binary\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"x3db\",\"x3dbz\"]},\"model/x3d+fastinfoset\":{\"source\":\"iana\",\"extensions\":[\"x3db\"]},\"model/x3d+vrml\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"x3dv\",\"x3dvz\"]},\"model/x3d+xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"x3d\",\"x3dz\"]},\"model/x3d-vrml\":{\"source\":\"iana\",\"extensions\":[\"x3dv\"]},\"multipart/alternative\":{\"source\":\"iana\",\"compressible\":false},\"multipart/appledouble\":{\"source\":\"iana\"},\"multipart/byteranges\":{\"source\":\"iana\"},\"multipart/digest\":{\"source\":\"iana\"},\"multipart/encrypted\":{\"source\":\"iana\",\"compressible\":false},\"multipart/form-data\":{\"source\":\"iana\",\"compressible\":false},\"multipart/header-set\":{\"source\":\"iana\"},\"multipart/mixed\":{\"source\":\"iana\"},\"multipart/multilingual\":{\"source\":\"iana\"},\"multipart/parallel\":{\"source\":\"iana\"},\"multipart/related\":{\"source\":\"iana\",\"compressible\":false},\"multipart/report\":{\"source\":\"iana\"},\"multipart/signed\":{\"source\":\"iana\",\"compressible\":false},\"multipart/vnd.bint.med-plus\":{\"source\":\"iana\"},\"multipart/voice-message\":{\"source\":\"iana\"},\"multipart/x-mixed-replace\":{\"source\":\"iana\"},\"text/1d-interleaved-parityfec\":{\"source\":\"iana\"},\"text/cache-manifest\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"appcache\",\"manifest\"]},\"text/calendar\":{\"source\":\"iana\",\"extensions\":[\"ics\",\"ifb\"]},\"text/calender\":{\"compressible\":true},\"text/cmd\":{\"compressible\":true},\"text/coffeescript\":{\"extensions\":[\"coffee\",\"litcoffee\"]},\"text/css\":{\"source\":\"iana\",\"charset\":\"UTF-8\",\"compressible\":true,\"extensions\":[\"css\"]},\"text/csv\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"csv\"]},\"text/csv-schema\":{\"source\":\"iana\"},\"text/directory\":{\"source\":\"iana\"},\"text/dns\":{\"source\":\"iana\"},\"text/ecmascript\":{\"source\":\"iana\"},\"text/encaprtp\":{\"source\":\"iana\"},\"text/enriched\":{\"source\":\"iana\"},\"text/flexfec\":{\"source\":\"iana\"},\"text/fwdred\":{\"source\":\"iana\"},\"text/grammar-ref-list\":{\"source\":\"iana\"},\"text/html\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"html\",\"htm\",\"shtml\"]},\"text/jade\":{\"extensions\":[\"jade\"]},\"text/javascript\":{\"source\":\"iana\",\"compressible\":true},\"text/jcr-cnd\":{\"source\":\"iana\"},\"text/jsx\":{\"compressible\":true,\"extensions\":[\"jsx\"]},\"text/less\":{\"compressible\":true,\"extensions\":[\"less\"]},\"text/markdown\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"markdown\",\"md\"]},\"text/mathml\":{\"source\":\"nginx\",\"extensions\":[\"mml\"]},\"text/mdx\":{\"compressible\":true,\"extensions\":[\"mdx\"]},\"text/mizar\":{\"source\":\"iana\"},\"text/n3\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"n3\"]},\"text/parameters\":{\"source\":\"iana\"},\"text/parityfec\":{\"source\":\"iana\"},\"text/plain\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"txt\",\"text\",\"conf\",\"def\",\"list\",\"log\",\"in\",\"ini\"]},\"text/provenance-notation\":{\"source\":\"iana\"},\"text/prs.fallenstein.rst\":{\"source\":\"iana\"},\"text/prs.lines.tag\":{\"source\":\"iana\",\"extensions\":[\"dsc\"]},\"text/prs.prop.logic\":{\"source\":\"iana\"},\"text/raptorfec\":{\"source\":\"iana\"},\"text/red\":{\"source\":\"iana\"},\"text/rfc822-headers\":{\"source\":\"iana\"},\"text/richtext\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"rtx\"]},\"text/rtf\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"rtf\"]},\"text/rtp-enc-aescm128\":{\"source\":\"iana\"},\"text/rtploopback\":{\"source\":\"iana\"},\"text/rtx\":{\"source\":\"iana\"},\"text/sgml\":{\"source\":\"iana\",\"extensions\":[\"sgml\",\"sgm\"]},\"text/shex\":{\"extensions\":[\"shex\"]},\"text/slim\":{\"extensions\":[\"slim\",\"slm\"]},\"text/strings\":{\"source\":\"iana\"},\"text/stylus\":{\"extensions\":[\"stylus\",\"styl\"]},\"text/t140\":{\"source\":\"iana\"},\"text/tab-separated-values\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"tsv\"]},\"text/troff\":{\"source\":\"iana\",\"extensions\":[\"t\",\"tr\",\"roff\",\"man\",\"me\",\"ms\"]},\"text/turtle\":{\"source\":\"iana\",\"charset\":\"UTF-8\",\"extensions\":[\"ttl\"]},\"text/ulpfec\":{\"source\":\"iana\"},\"text/uri-list\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"uri\",\"uris\",\"urls\"]},\"text/vcard\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"vcard\"]},\"text/vnd.a\":{\"source\":\"iana\"},\"text/vnd.abc\":{\"source\":\"iana\"},\"text/vnd.ascii-art\":{\"source\":\"iana\"},\"text/vnd.curl\":{\"source\":\"iana\",\"extensions\":[\"curl\"]},\"text/vnd.curl.dcurl\":{\"source\":\"apache\",\"extensions\":[\"dcurl\"]},\"text/vnd.curl.mcurl\":{\"source\":\"apache\",\"extensions\":[\"mcurl\"]},\"text/vnd.curl.scurl\":{\"source\":\"apache\",\"extensions\":[\"scurl\"]},\"text/vnd.debian.copyright\":{\"source\":\"iana\"},\"text/vnd.dmclientscript\":{\"source\":\"iana\"},\"text/vnd.dvb.subtitle\":{\"source\":\"iana\",\"extensions\":[\"sub\"]},\"text/vnd.esmertec.theme-descriptor\":{\"source\":\"iana\"},\"text/vnd.ficlab.flt\":{\"source\":\"iana\"},\"text/vnd.fly\":{\"source\":\"iana\",\"extensions\":[\"fly\"]},\"text/vnd.fmi.flexstor\":{\"source\":\"iana\",\"extensions\":[\"flx\"]},\"text/vnd.gml\":{\"source\":\"iana\"},\"text/vnd.graphviz\":{\"source\":\"iana\",\"extensions\":[\"gv\"]},\"text/vnd.hgl\":{\"source\":\"iana\"},\"text/vnd.in3d.3dml\":{\"source\":\"iana\",\"extensions\":[\"3dml\"]},\"text/vnd.in3d.spot\":{\"source\":\"iana\",\"extensions\":[\"spot\"]},\"text/vnd.iptc.newsml\":{\"source\":\"iana\"},\"text/vnd.iptc.nitf\":{\"source\":\"iana\"},\"text/vnd.latex-z\":{\"source\":\"iana\"},\"text/vnd.motorola.reflex\":{\"source\":\"iana\"},\"text/vnd.ms-mediapackage\":{\"source\":\"iana\"},\"text/vnd.net2phone.commcenter.command\":{\"source\":\"iana\"},\"text/vnd.radisys.msml-basic-layout\":{\"source\":\"iana\"},\"text/vnd.senx.warpscript\":{\"source\":\"iana\"},\"text/vnd.si.uricatalogue\":{\"source\":\"iana\"},\"text/vnd.sosi\":{\"source\":\"iana\"},\"text/vnd.sun.j2me.app-descriptor\":{\"source\":\"iana\",\"extensions\":[\"jad\"]},\"text/vnd.trolltech.linguist\":{\"source\":\"iana\"},\"text/vnd.wap.si\":{\"source\":\"iana\"},\"text/vnd.wap.sl\":{\"source\":\"iana\"},\"text/vnd.wap.wml\":{\"source\":\"iana\",\"extensions\":[\"wml\"]},\"text/vnd.wap.wmlscript\":{\"source\":\"iana\",\"extensions\":[\"wmls\"]},\"text/vtt\":{\"charset\":\"UTF-8\",\"compressible\":true,\"extensions\":[\"vtt\"]},\"text/x-asm\":{\"source\":\"apache\",\"extensions\":[\"s\",\"asm\"]},\"text/x-c\":{\"source\":\"apache\",\"extensions\":[\"c\",\"cc\",\"cxx\",\"cpp\",\"h\",\"hh\",\"dic\"]},\"text/x-component\":{\"source\":\"nginx\",\"extensions\":[\"htc\"]},\"text/x-fortran\":{\"source\":\"apache\",\"extensions\":[\"f\",\"for\",\"f77\",\"f90\"]},\"text/x-gwt-rpc\":{\"compressible\":true},\"text/x-handlebars-template\":{\"extensions\":[\"hbs\"]},\"text/x-java-source\":{\"source\":\"apache\",\"extensions\":[\"java\"]},\"text/x-jquery-tmpl\":{\"compressible\":true},\"text/x-lua\":{\"extensions\":[\"lua\"]},\"text/x-markdown\":{\"compressible\":true,\"extensions\":[\"mkd\"]},\"text/x-nfo\":{\"source\":\"apache\",\"extensions\":[\"nfo\"]},\"text/x-opml\":{\"source\":\"apache\",\"extensions\":[\"opml\"]},\"text/x-org\":{\"compressible\":true,\"extensions\":[\"org\"]},\"text/x-pascal\":{\"source\":\"apache\",\"extensions\":[\"p\",\"pas\"]},\"text/x-processing\":{\"compressible\":true,\"extensions\":[\"pde\"]},\"text/x-sass\":{\"extensions\":[\"sass\"]},\"text/x-scss\":{\"extensions\":[\"scss\"]},\"text/x-setext\":{\"source\":\"apache\",\"extensions\":[\"etx\"]},\"text/x-sfv\":{\"source\":\"apache\",\"extensions\":[\"sfv\"]},\"text/x-suse-ymp\":{\"compressible\":true,\"extensions\":[\"ymp\"]},\"text/x-uuencode\":{\"source\":\"apache\",\"extensions\":[\"uu\"]},\"text/x-vcalendar\":{\"source\":\"apache\",\"extensions\":[\"vcs\"]},\"text/x-vcard\":{\"source\":\"apache\",\"extensions\":[\"vcf\"]},\"text/xml\":{\"source\":\"iana\",\"compressible\":true,\"extensions\":[\"xml\"]},\"text/xml-external-parsed-entity\":{\"source\":\"iana\"},\"text/yaml\":{\"extensions\":[\"yaml\",\"yml\"]},\"video/1d-interleaved-parityfec\":{\"source\":\"iana\"},\"video/3gpp\":{\"source\":\"iana\",\"extensions\":[\"3gp\",\"3gpp\"]},\"video/3gpp-tt\":{\"source\":\"iana\"},\"video/3gpp2\":{\"source\":\"iana\",\"extensions\":[\"3g2\"]},\"video/bmpeg\":{\"source\":\"iana\"},\"video/bt656\":{\"source\":\"iana\"},\"video/celb\":{\"source\":\"iana\"},\"video/dv\":{\"source\":\"iana\"},\"video/encaprtp\":{\"source\":\"iana\"},\"video/flexfec\":{\"source\":\"iana\"},\"video/h261\":{\"source\":\"iana\",\"extensions\":[\"h261\"]},\"video/h263\":{\"source\":\"iana\",\"extensions\":[\"h263\"]},\"video/h263-1998\":{\"source\":\"iana\"},\"video/h263-2000\":{\"source\":\"iana\"},\"video/h264\":{\"source\":\"iana\",\"extensions\":[\"h264\"]},\"video/h264-rcdo\":{\"source\":\"iana\"},\"video/h264-svc\":{\"source\":\"iana\"},\"video/h265\":{\"source\":\"iana\"},\"video/iso.segment\":{\"source\":\"iana\"},\"video/jpeg\":{\"source\":\"iana\",\"extensions\":[\"jpgv\"]},\"video/jpeg2000\":{\"source\":\"iana\"},\"video/jpm\":{\"source\":\"apache\",\"extensions\":[\"jpm\",\"jpgm\"]},\"video/mj2\":{\"source\":\"iana\",\"extensions\":[\"mj2\",\"mjp2\"]},\"video/mp1s\":{\"source\":\"iana\"},\"video/mp2p\":{\"source\":\"iana\"},\"video/mp2t\":{\"source\":\"iana\",\"extensions\":[\"ts\"]},\"video/mp4\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"mp4\",\"mp4v\",\"mpg4\"]},\"video/mp4v-es\":{\"source\":\"iana\"},\"video/mpeg\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"mpeg\",\"mpg\",\"mpe\",\"m1v\",\"m2v\"]},\"video/mpeg4-generic\":{\"source\":\"iana\"},\"video/mpv\":{\"source\":\"iana\"},\"video/nv\":{\"source\":\"iana\"},\"video/ogg\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"ogv\"]},\"video/parityfec\":{\"source\":\"iana\"},\"video/pointer\":{\"source\":\"iana\"},\"video/quicktime\":{\"source\":\"iana\",\"compressible\":false,\"extensions\":[\"qt\",\"mov\"]},\"video/raptorfec\":{\"source\":\"iana\"},\"video/raw\":{\"source\":\"iana\"},\"video/rtp-enc-aescm128\":{\"source\":\"iana\"},\"video/rtploopback\":{\"source\":\"iana\"},\"video/rtx\":{\"source\":\"iana\"},\"video/smpte291\":{\"source\":\"iana\"},\"video/smpte292m\":{\"source\":\"iana\"},\"video/ulpfec\":{\"source\":\"iana\"},\"video/vc1\":{\"source\":\"iana\"},\"video/vc2\":{\"source\":\"iana\"},\"video/vnd.cctv\":{\"source\":\"iana\"},\"video/vnd.dece.hd\":{\"source\":\"iana\",\"extensions\":[\"uvh\",\"uvvh\"]},\"video/vnd.dece.mobile\":{\"source\":\"iana\",\"extensions\":[\"uvm\",\"uvvm\"]},\"video/vnd.dece.mp4\":{\"source\":\"iana\"},\"video/vnd.dece.pd\":{\"source\":\"iana\",\"extensions\":[\"uvp\",\"uvvp\"]},\"video/vnd.dece.sd\":{\"source\":\"iana\",\"extensions\":[\"uvs\",\"uvvs\"]},\"video/vnd.dece.video\":{\"source\":\"iana\",\"extensions\":[\"uvv\",\"uvvv\"]},\"video/vnd.directv.mpeg\":{\"source\":\"iana\"},\"video/vnd.directv.mpeg-tts\":{\"source\":\"iana\"},\"video/vnd.dlna.mpeg-tts\":{\"source\":\"iana\"},\"video/vnd.dvb.file\":{\"source\":\"iana\",\"extensions\":[\"dvb\"]},\"video/vnd.fvt\":{\"source\":\"iana\",\"extensions\":[\"fvt\"]},\"video/vnd.hns.video\":{\"source\":\"iana\"},\"video/vnd.iptvforum.1dparityfec-1010\":{\"source\":\"iana\"},\"video/vnd.iptvforum.1dparityfec-2005\":{\"source\":\"iana\"},\"video/vnd.iptvforum.2dparityfec-1010\":{\"source\":\"iana\"},\"video/vnd.iptvforum.2dparityfec-2005\":{\"source\":\"iana\"},\"video/vnd.iptvforum.ttsavc\":{\"source\":\"iana\"},\"video/vnd.iptvforum.ttsmpeg2\":{\"source\":\"iana\"},\"video/vnd.motorola.video\":{\"source\":\"iana\"},\"video/vnd.motorola.videop\":{\"source\":\"iana\"},\"video/vnd.mpegurl\":{\"source\":\"iana\",\"extensions\":[\"mxu\",\"m4u\"]},\"video/vnd.ms-playready.media.pyv\":{\"source\":\"iana\",\"extensions\":[\"pyv\"]},\"video/vnd.nokia.interleaved-multimedia\":{\"source\":\"iana\"},\"video/vnd.nokia.mp4vr\":{\"source\":\"iana\"},\"video/vnd.nokia.videovoip\":{\"source\":\"iana\"},\"video/vnd.objectvideo\":{\"source\":\"iana\"},\"video/vnd.radgamettools.bink\":{\"source\":\"iana\"},\"video/vnd.radgamettools.smacker\":{\"source\":\"iana\"},\"video/vnd.sealed.mpeg1\":{\"source\":\"iana\"},\"video/vnd.sealed.mpeg4\":{\"source\":\"iana\"},\"video/vnd.sealed.swf\":{\"source\":\"iana\"},\"video/vnd.sealedmedia.softseal.mov\":{\"source\":\"iana\"},\"video/vnd.uvvu.mp4\":{\"source\":\"iana\",\"extensions\":[\"uvu\",\"uvvu\"]},\"video/vnd.vivo\":{\"source\":\"iana\",\"extensions\":[\"viv\"]},\"video/vnd.youtube.yt\":{\"source\":\"iana\"},\"video/vp8\":{\"source\":\"iana\"},\"video/webm\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"webm\"]},\"video/x-f4v\":{\"source\":\"apache\",\"extensions\":[\"f4v\"]},\"video/x-fli\":{\"source\":\"apache\",\"extensions\":[\"fli\"]},\"video/x-flv\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"flv\"]},\"video/x-m4v\":{\"source\":\"apache\",\"extensions\":[\"m4v\"]},\"video/x-matroska\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"mkv\",\"mk3d\",\"mks\"]},\"video/x-mng\":{\"source\":\"apache\",\"extensions\":[\"mng\"]},\"video/x-ms-asf\":{\"source\":\"apache\",\"extensions\":[\"asf\",\"asx\"]},\"video/x-ms-vob\":{\"source\":\"apache\",\"extensions\":[\"vob\"]},\"video/x-ms-wm\":{\"source\":\"apache\",\"extensions\":[\"wm\"]},\"video/x-ms-wmv\":{\"source\":\"apache\",\"compressible\":false,\"extensions\":[\"wmv\"]},\"video/x-ms-wmx\":{\"source\":\"apache\",\"extensions\":[\"wmx\"]},\"video/x-ms-wvx\":{\"source\":\"apache\",\"extensions\":[\"wvx\"]},\"video/x-msvideo\":{\"source\":\"apache\",\"extensions\":[\"avi\"]},\"video/x-sgi-movie\":{\"source\":\"apache\",\"extensions\":[\"movie\"]},\"video/x-smv\":{\"source\":\"apache\",\"extensions\":[\"smv\"]},\"x-conference/x-cooltalk\":{\"source\":\"apache\",\"extensions\":[\"ice\"]},\"x-shader/x-fragment\":{\"compressible\":true},\"x-shader/x-vertex\":{\"compressible\":true}}");

/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");;

/***/ }),

/***/ 605:
/***/ ((module) => {

"use strict";
module.exports = require("http");;

/***/ }),

/***/ 211:
/***/ ((module) => {

"use strict";
module.exports = require("https");;

/***/ }),

/***/ 87:
/***/ ((module) => {

"use strict";
module.exports = require("os");;

/***/ }),

/***/ 622:
/***/ ((module) => {

"use strict";
module.exports = require("path");;

/***/ }),

/***/ 413:
/***/ ((module) => {

"use strict";
module.exports = require("stream");;

/***/ }),

/***/ 835:
/***/ ((module) => {

"use strict";
module.exports = require("url");;

/***/ }),

/***/ 669:
/***/ ((module) => {

"use strict";
module.exports = require("util");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	__nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __nccwpck_require__(109);
/******/ })()
;
//# sourceMappingURL=index.js.map