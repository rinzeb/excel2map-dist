var widgets;
(function (widgets) {
    /**
      * Config
      */
    var moduleName = 'csComp';
    try {
        widgets.myModule = angular.module(moduleName);
    }
    catch (err) {
        // named module does not exist, so create one
        widgets.myModule = angular.module(moduleName, []);
    }
    /**
      * Directive to display the available map layers.
      */
    widgets.myModule.directive('e2muploadwidget', [function () {
            return {
                restrict: 'E',
                scope: {},
                templateUrl: 'widgets/E2MUploadWidget.tpl.html',
                replace: true,
                transclude: false,
                controller: widgets.E2MUploadWidgetCtrl
            };
        }
    ]);
})(widgets || (widgets = {}));
