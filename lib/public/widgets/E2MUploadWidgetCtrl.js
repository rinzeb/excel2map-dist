var widgets;
(function (widgets) {
    var E2MUploadWidgetData = (function () {
        function E2MUploadWidgetData() {
        }
        return E2MUploadWidgetData;
    }());
    widgets.E2MUploadWidgetData = E2MUploadWidgetData;
    var E2MUploadWidgetCtrl = (function () {
        function E2MUploadWidgetCtrl($scope, $timeout, $layerService, $messageBus, $mapService) {
            var _this = this;
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$layerService = $layerService;
            this.$messageBus = $messageBus;
            this.$mapService = $mapService;
            $scope.vm = this;
            var par = $scope.$parent;
            this.widget = par.widget;
            $scope.data = this.widget.data;
            $scope.minimized = false;
            this.dataProperties = {};
            this.parentWidget = $('#' + this.widget.elementId).parent();
            $("#file-upload").change(function () { _this.readFile(); });
            document.getElementById("drop-box").addEventListener("drop", function (evt) { _this.fileDropped(evt); }, false);
            // Check for the various File API support.
            if (window.File && window.FileReader) {
                // Required File APIs are supported.
                this.uploadAvailable = true;
            }
            else {
                this.uploadAvailable = false;
            }
        }
        E2MUploadWidgetCtrl.prototype.fileDropped = function (evt) {
            evt.stopPropagation();
            evt.preventDefault();
            this.readFile(evt.dataTransfer.files[0]);
        };
        E2MUploadWidgetCtrl.prototype.canMinimize = function () {
            return (this.$scope.data.hasOwnProperty('canMinimize'))
                ? this.$scope.data['canMinimize']
                : true;
        };
        E2MUploadWidgetCtrl.prototype.minimize = function () {
            this.$scope.minimized = !this.$scope.minimized;
            if (this.$scope.minimized) {
                this.parentWidget.css('height', '30px');
            }
            else {
                this.parentWidget.css('height', this.widget.height);
            }
        };
        E2MUploadWidgetCtrl.prototype.canClose = function () {
            return (this.$scope.data.hasOwnProperty('canClose'))
                ? this.$scope.data['canClose']
                : true;
        };
        E2MUploadWidgetCtrl.prototype.close = function () {
            this.parentWidget.hide();
        };
        E2MUploadWidgetCtrl.prototype.stop = function () {
            if (this.msgBusHandle) {
                this.$messageBus.unsubscribe(this.msgBusHandle);
            }
        };
        E2MUploadWidgetCtrl.prototype.escapeRegExp = function (str) {
            return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
        };
        E2MUploadWidgetCtrl.prototype.replaceAll = function (str, find, replace) {
            return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
        };
        E2MUploadWidgetCtrl.prototype.readFile = function (file) {
            var _this = this;
            if (!this.uploadAvailable) {
                this.$messageBus.notifyError('Cannot upload files', 'Try using a modern browser (Chrome, FireFox, Edge) to be able to upload files, or use the copy/paste option.');
                return;
            }
            if (!file) {
                file = $('#file-upload')[0].files[0];
            }
            if (!file || !file.name || file.name.indexOf('.') < 0) {
                this.$messageBus.notifyError('Cannot upload this file', 'The file should have the .json-extension.');
                return;
            }
            else {
                var ext = file.name.split('.').pop();
                if (ext.toLowerCase() !== 'json') {
                    this.$messageBus.notifyError('Cannot upload this file', 'The file should have the .json-extension.');
                    return;
                }
            }
            var reader = new FileReader();
            reader.onload = function (e) {
                _this.textContent = reader.result;
                _this.updatedContent();
            };
            reader.readAsText(file);
        };
        // Extract the projectID from the json-data and set it in the projectId box
        E2MUploadWidgetCtrl.prototype.updatedContent = function () {
            try {
                this.parsedContent = JSON.parse(this.textContent);
                if (this.parsedContent.hasOwnProperty('projectId') && this.parsedContent['projectId'].length > 0) {
                    this.projectId = this.parsedContent['projectId'];
                }
                else {
                    this.projectId = null;
                    this.password = null;
                    console.log('No project id found');
                }
            }
            catch (error) {
                this.parsedContent = null;
            }
            if (this.$scope.$root.$$phase !== '$apply' && this.$scope.$root.$$phase !== '$digest') {
                this.$scope.$apply();
            }
        };
        E2MUploadWidgetCtrl.prototype.convertData = function () {
            var _this = this;
            this.updatedContent();
            if (!this.parsedContent) {
                this.$messageBus.notifyError('Invalid data format', 'Could not find a project ID in the supplied data.');
                return;
            }
            // If projectID is supplied, use it. Else request a new project instead. 
            if (!this.projectId) {
                this.$messageBus.notifyError('No project ID supplied', 'Could not find a project ID in the supplied data. Excel2Map will create a new project ID for you.');
                $.ajax({
                    type: "POST",
                    url: "http://localhost:3004/requestproject",
                    data: {},
                    success: function (data) {
                        _this.$timeout(function () {
                            _this.$messageBus.notify('Project ID acquired', 'A new project ID has been created successfully');
                            _this.password = data.password;
                            _this.projectId = data.id;
                            _this.parsedContent['projectId'] = data.id;
                            _this.textContent = JSON.stringify(_this.parsedContent, null, 2);
                        }, 0);
                        _this.$timeout(function () {
                            _this.uploadProject();
                        }, 200);
                    },
                    error: function (err, type, msg) {
                        _this.$messageBus.notifyError('Error while creating project', 'An error occurred when creating your project: ' + err.status + ' ' + msg);
                    }
                });
            }
            else {
                this.uploadProject();
            }
        };
        E2MUploadWidgetCtrl.prototype.uploadProject = function () {
            var _this = this;
            $.ajax({
                type: "POST",
                url: "http://localhost:3004/projecttemplate",
                data: this.parsedContent,
                headers: {
                    "Authorization": "Basic " + btoa(this.projectId + ":" + this.password)
                },
                success: function () {
                    _this.$messageBus.notify('Project uploaded', 'Your data has been uploaded successfully');
                },
                error: function (err, type, msg) {
                    if (err.status == 401) {
                        _this.$messageBus.notifyWithTranslation('ERROR_UPLOADING_PROJECT', 'UNAUTHORIZED');
                    }
                    else {
                        _this.$messageBus.notifyWithTranslation('ERROR_UPLOADING_PROJECT', 'ERROR_MSG', { 'msg': err.status + ' ' + msg });
                    }
                }
            });
        };
        E2MUploadWidgetCtrl.$inject = [
            '$scope',
            '$timeout',
            'layerService',
            'messageBusService',
            'mapService'
        ];
        return E2MUploadWidgetCtrl;
    }());
    widgets.E2MUploadWidgetCtrl = E2MUploadWidgetCtrl;
})(widgets || (widgets = {}));
