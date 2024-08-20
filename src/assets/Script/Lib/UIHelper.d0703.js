/**
 * 使用方法
 * ui名称以‘_’开头的的节点会被解析到
 * ui名称中含有‘$’则表示需要读取这个节点下的组件，$后面的数值表示需要哪个组件，默认的node下组件在_components里面的索引是按照“属性检查器”中显示是组件顺序来的
 *  $023就表示获取第1个和第3，4个组件
 * ui名称以‘__’为名称开头的节点表示不遍历其子节点
 * 
 * 不能命名_name的节点，会覆盖CCNode的_name
 */

window['UIHelper'] = {};

/**
 * 根据子节点索引获取子节点
 * @param {string} path 
 * @param {cc.Node} node 
 */
function find(path, node) {
    var match = node;
    var startIndex = (path[0] !== '/') ? 0 : 1;
    var nameList = path.split('/');


    for (let n = startIndex, len = nameList.length; n < len; n++) {
        match = match._children[nameList[n]];
    }

    if (!match) {
        return null;
    }

    return match;
}

// 缓存节点路径
UIHelper._cache = cc.js.createMap(); // 这样创建的{}在查找其属性的时候不需要使用Object.hasDefineProperty去判断是否含有指定属性。

UIHelper.bindUI = function (uiRoot, target) {
    let uiName = target.name;
    uiName = uiName.substring(uiName.indexOf('<') + 1, uiName.lastIndexOf('>')); // 节点的名称可能会不一样，而脚本组件的名称不会改变

    if (uiName.length === 0) { // 节点没有绑定脚本组件的情况下使用节点名称
        uiName = uiRoot.name;
        var $index = uiName.indexOf('$');
        if ($index > 0) {
            uiName = uiName.substring(0, $index);
        }
    }

    var cache = UIHelper._cache[uiName];
    if (!cache) {
        cache = cc.js.createMap();
        // UIHelper._cache[uiName] = cache;

        var usefulNode = [];
        var path = '';
        UIHelper.findAllNode(uiRoot, usefulNode, cache, path);
        UIHelper.bindUI2Target(usefulNode, target);
    } else {
        UIHelper.bindUI2TargetByCache(uiRoot, cache, target);
    }
}

// 深度优先的方式访问ui树
UIHelper.findAllNode = function (node, outArr, cache, path) {
    var child;
    for (var i = 0; i < node.children.length; i++) {
        child = node.children[i];
        if (child.name[0] !== '_' && (child.name.indexOf('UI') > 0 || child.name.indexOf('SItem') > 0)) { // UI节点下挂载了其他UI节点、ScrollView的Item也不去遍历
            continue;
        }
        if (child.name[0] === '_') {// 节点名称以“_”开头的节点记录下来
            outArr.push(child);
            cache[child.name] = path + '/' + i.toString();
        }

        if (child.children.length <= 0) {
            continue;
        }

        if (child.name.length > 3 && child.name[1] === '_') { // 不遍历以‘__’为开头的节点的子节点
            continue;
        }

        var newPath = path + '/' + i.toString();
        UIHelper.findAllNode(node.children[i], outArr, cache, newPath);
    }
}

UIHelper.bindUI2Target = function (nodes, target) {
    // console.log('---------------------bindUI2Target---------------------', target.name);
    for (var i = nodes.length - 1, node = null; i >= 0; i--) {
        node = nodes[i];
        var $index = node.name.indexOf('$')
        var hasComp = $index > 0;
        var hasBtn = node.name.indexOf('_btn') >= 0;
        var hasIrBtn = node.name.indexOf('_irbtn') >= 0;
        var hasToggle = node.name.indexOf('_toggle') >= 0;

        var hasEditBox = node.name.indexOf('_editBox') >= 0;

        var propertyName = hasComp ? node.name.substring(0, $index) : node.name;
        target[propertyName] = node;

        //缓存editBox组件节点,方便操作
        //要在对应脚本里添加editBoxMap对象
        if (hasEditBox && target['editBoxMap']) {
            let name = propertyName;
            name = name.substring(8);

            target.editBoxMap[name] = node;
        }

        // 绑定组件，直接访问
        hasComp && UIHelper.bindCompnent(node);
        // 给按钮绑定事件
        if (hasBtn) {
            var btnName = node.name;
            let callbackName = 'on' + (btnName.indexOf('$') < 0 ? btnName : btnName.substring(0, btnName.indexOf('$')));
            UIHelper.bindBtnEvent(node, target, callbackName);
        }
        if (hasIrBtn) {
            var btnName = node.name;
            let callbackName = 'on' + (btnName.indexOf('$') < 0 ? btnName : btnName.substring(0, btnName.indexOf('$')));
            UIHelper.bindIrBtnEvent(node, target, callbackName);
        }
        // 绑定Toggle点击事件
        hasToggle && UIHelper.bindToggleEvent(node, target);
    }
}

UIHelper.bindCompnent = function (node) {
    var nodeName = node.name;
    if (nodeName.indexOf('$') > 0) {
        var index = nodeName.indexOf('$');
        var comName = null;
        for (var i = nodeName.length - 1; i > index; i--) {
            // console.log(nodeName);
            comName = node._components[nodeName[i]].name;
            comName = comName.substring(comName.indexOf('<') + 1, comName.lastIndexOf('>'));
            node['$' + comName] = node._components[nodeName[i]];
        }
    }
}

UIHelper.bindUI2TargetByCache = function (uiRoot, cache, target) {
    var nodes = [];
    var node = null;
    for (var nodeName in cache) {
        node = find(cache[nodeName], uiRoot);
        if (node) {
            nodes.push(node);
        }
        else {
            cc.error('not found node.', nodeName, cache[nodeName]);
        }
    }
    UIHelper.bindUI2Target(nodes, target);
}

/**
 * 绑定按钮回调
 */
UIHelper.bindBtnEvent = function (btnNode, target, callbackName) {
    var eventHandler = new cc.Component.EventHandler();
    eventHandler.target = target.node;
    eventHandler.component = target.name.substring(target.name.indexOf('<') + 1, target.name.indexOf('>'));
    eventHandler.handler = callbackName // 绑定回调方法名称
    eventHandler.customEventData = '';
    var btnComp = btnNode.getComponent(cc.Button);
    if (!btnComp) {
        btnComp = btnNode.addComponent(cc.Button);
        btnComp.transition = cc.Button.Transition.SCALE;
        btnComp.duration = 0.1;
        btnComp.zoomScale = 0.9;
        btnComp.target = btnNode;
    }
    btnComp.clickEvents.push(eventHandler);

    var eventHandler2 = new cc.Component.EventHandler();
    eventHandler2.target = target.node;
    eventHandler2.component = target.name.substring(target.name.indexOf('<') + 1, target.name.indexOf('>'));
    eventHandler2.handler = "_playMusic" // 绑定回调方法名称
    eventHandler2.customEventData = '';
    btnComp.clickEvents.push(eventHandler2);
}

UIHelper.bindToggleEvent = function (toggleNode, target) {
    let nodeName = toggleNode.name;
    let callbackName = 'on' + (nodeName.indexOf('$') < 0 ? nodeName : nodeName.substring(0, nodeName.indexOf('$')));
    let checkMark = toggleNode.getComponent(cc.Toggle).checkMark;
    checkMark.node.on('active-in-hierarchy-changed', target[callbackName], target);
}

/**
 * 绑定不规则按钮的回调事件
 */
UIHelper.bindIrBtnEvent = function (btnNode, target, callbackName) {
    var eventHandler = new cc.Component.EventHandler();
    eventHandler.target = target.node;
    eventHandler.component = target.name.substring(target.name.indexOf('<') + 1, target.name.indexOf('>'));
    eventHandler.handler = callbackName // 绑定回调方法名称
    eventHandler.customEventData = '';
    var btnComp = btnNode.getComponent('IrregularityButton');
    btnComp.clickEvents.push(eventHandler);
}

