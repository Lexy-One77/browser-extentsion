const PATH = '/order/orderlist/',
    COOKIE_NAME = 'jd_extension_token';//权限名称

let runtime = null; 
let tabs = null;
let storage = null;
/**
 * 判断浏览器类型，目前支持：火狐、谷歌、360
 */
let browserType = () => {
    let ua = navigator && navigator.userAgent;
    if (!ua || !ua.length) {
        return Promise.reject({code: 0, msg: '未知浏览器'});
    }

    if (ua.indexOf('Gecko/') > 0 && ua.indexOf('Firefox/') > 0) {//Gecko内核浏览器
        //调用Gecko相关方法
        runtime = browser.runtime;
        tabs = browser.tabs;
        storage = browser.storage;
        return Promise.resolve({code: 1, data: 'firefox'});
    } else if (ua.indexOf('AppleWebKit/') > 0 && ua.indexOf('Chrome/') > 0) {//WebKit内核浏览器
        //调用WebKit相关方法
        runtime = chrome.runtime;
        tabs = chrome.tabs;
        storage = chrome.storage;
        return Promise.resolve({code: 1, data: 'chrome'});
    } else {
        return Promise.reject({code: 0, msg: '暂不支持当前浏览器'});
    }
};

/**
 * 是否显示插件页面
 * @param option
 */
let show = (option) => {
    console.log(option);
    if (!option || typeof option.code != 'number') {
        $("#content").addClass('hidden');
        $("#error-content").removeClass('hidden');
        return;
    }
    if (option.code == 1) {
        $("#content").removeClass('hidden');
        $("#error-content").addClass('hidden');
    } else {
        $("#content").addClass('hidden');
        $("#error-content").removeClass('hidden');
    }
};

/**
 * 弹窗提示
 * @param msg
 */
//TODO：msg弹窗
let alertFun = (msg) => {
    let msgParents = $('.plug_alert');
    if (msgParents.is(':hidden')) {
        if ($.trim(msg)) {
            msgParents.show();
            msgParents.find('.alertText').text(msg);
        } else {
            msgParents.hide();
        }
    }
    setTimeout(function () {
        msgParents.hide();
    }, 2000)
};

/**
 * 插件右上角显示提示信息
 * @param res
 */
let msg = (res) => {

    //隐藏等待效果
    $('.jdmhLoading').hide();

    //TODO：插件右上角显示提示信息
    if (!res) {
        return alertFun('系统异常');
    }
    if (res.code != 1) {
        return alertFun(res.msg || '系统异常');
    }
    return alertFun(res.data || '');
};

/**
 * 渲染动态列表
 * @param option：可选参数
 */
const UlMove = function (data) {
    this.data = data;
    this.wrap = $('.plug_ul_wrap');
    this.ul = $('.plug_ul');
    this.renderUl();
    this.topH = -30;
    this.len = $('.plug_ul li').length;
    this.index = 0;
    this.ulClone = this.ul.clone();
    this.ulClone.addClass('active');
    this.wrap.append(this.ulClone);
};
UlMove.prototype.renderUl = function () {
    let _this = this;
    this.ul.find('li').remove();
    this.data && this.data.map(function (item) {
        _this.ul.append('<li>最新互动：' + item.create_at + ' ' + item.jd_uid_name + ' 被标记为 【' + item.labels_name + '】</li>')
    });
};
UlMove.prototype.move = function () {
    this.index++;
    let moveUl = this.wrap.find('.plug_ul.active');
    let _this = this;
    moveUl.css('top', _this.index * _this.topH);
    if (_this.index === _this.len) {
        _this.index = 0;
        _this.wrap.find('.plug_ul').each(function (i, item) {
            if ($(item).hasClass('active')) {
                $(item).removeClass('active');
                $(item).css('top', _this.topH * -1)
            } else {
                $(item).css('top', 0);
                $(item).addClass('active');
            }
        });
    }
};
UlMove.prototype.interval = function () {
    let _this = this;
    setInterval(function () {
        _this.move();
    }, 3000);
};
/**
 * 根据登录状态控制页面显示
 * @param option：可选参数
 */
let render = (option) => {

    //隐藏等待效果
    $('.jdmhLoading').hide();

    //最新动态滚动
    if (option && option.moveList) {
        let ulFun = new UlMove(option.moveList);
        ulFun.interval();
    }
    //登录前
    if (option === 'login') {
        $('.bottom_wrap').addClass('hidden');
        $('.login_wrap').removeClass('hidden');
        $('.loginText').addClass('hidden');
    }
    //未绑定店铺
    if (option === 'bind') {
        $('.bottom_wrap').addClass('hidden');
        $('.bind_wrap').removeClass('hidden');
    }
    //绑定成功之后
    if (option === 'success') {
        $('.bottom_wrap').addClass('hidden');
        $('.success_wrap').removeClass('hidden');
        $('.loginText').removeClass('hidden');
    }
};

/**
 * 全局变量
 * @type {string}
 */
let Cookie, BT, Tab;//登录状态、浏览器内核、页签对象
/**
 * 获取插件信息
 * @param option:可选参数
 */
let extensionInfo = (option) => {
    if (!option || !option.type) {
        return Promise.reject({code: 0, msg: '暂不支持当前浏览器'});
    }
    if (runtime != null && option.type == "chrome") {//谷歌内核
        return new Promise((resolve, reject) => {
            runtime.sendMessage({ port: { name: "extensionInfo"}}, function(res){
                resolve(res);
            });
        });
    } else if (runtime != null && option.type == "firefox") {
        return runtime.sendMessage({ method: "extensionInfo" });
    } else {
        return Promise.reject({code: 0, msg: '暂不支持当前浏览器'});
    }
}

/**
 * 最新互动
 * @param option
 */
let latestMsg = (option) => {

    if (!option || !option.type) {
        return Promise.reject({code: 0, msg: '暂不支持当前浏览器'});
    }

    if (tabs!=null) {
        if (!option.tab) {
            return Promise.reject({code: 0, msg: '请登录后在订单列表页操作'});
        }
        //let port = tabs.connect(option.tab.id, {name: "latestMsg"});
        
        if(option.type=="chrome"){
            return new Promise(resolve => {
                runtime.sendMessage({ method: "lastMsg" }, function(res){
                    if (res.code != 0 && res.msg){
                        tabs.sendMessage(option.tab.id, { method: "lastMsg", err}, function(){})
                    }
                    return resolve(res);
                })
            })
        } else if (option.type == "firefox"){
            return runtime.sendMessage( { method: "latestMsg" }).then(res=>{
                if (res.code != 0 && res.msg) {
                    tabs.sendMessage(option.tab.id, { method: "lastMsg", err })
                }
                return res;
            });
        }
    } else {
        return Promise.reject({code: 0, msg: '暂不支持当前浏览器'});
    }
};
/*
* 保存账号密码函数
* */
let setUserInfo = (phone,password) => {
    window.localStorage.setItem('plug_phone',phone);
    window.localStorage.setItem('plug_password',password);
};
/*
* 获取账号密码
* */
let gerUserInfo = ()=>{
    let mphone = window.localStorage.getItem('plug_phone');
    let password = window.localStorage.getItem('plug_password');
    if(mphone){
        $('#account').val(mphone);
    }
    if(password){
        $('#pwd').val(password);
    }
};
gerUserInfo();

/**
 * 根据登录状态，执行后续操作等。
 * 监听按钮点击事件（登录、手动更新）
 * @param option
 */
let otherOperation = (option) => {

    if (!option || !option.type || !option.tab) {
        return Promise.reject({code: 0, msg: '暂不支持当前浏览器'});
    }

    let now = Math.floor(Date.now() / 1000);//当前时间戳，精确到秒，用于对比cookie是否过期

    /**
     * 初始化按钮事件监听
     */
    //监听登录按钮
    document.getElementById('submit').onclick = function () {

        //显示等待效果
        $('.jdmhLoading').show();

        //TODO：获取账号密码
        let mphone = $('#account').val();
        let password = $('#pwd').val();

        if (!mphone || !mphone.trim() || !password || !password.trim()) {
            return msg({code: 0, msg: '请输入手机号和密码'});
        }
        if (mphone.length != 11 || isNaN(mphone)) {
            return msg({code: 0, msg: '清输入正确的手机号'});
        }
        if (mphone != mphone.trim() || password != password.trim()) {
            return msg({code: 0, msg: '手机号和密码中不能有空格'});
        }
        if (!runtime) return msg({ code: 0, msg: '暂不支持当前浏览器' });
        return new Promise((resolve, reject) => {
            let callback = function (res) {
                if (!res) {
                    return msg({ code: 0, msg: '登录请求异常' });
                }
                //保存用户名密码
                if($('#remember').is(':checked')){
                    setUserInfo(mphone,password);
                }
                if (res.code == 1003) {//未绑定店铺
                    //TODO：显示未绑定店铺页面
                    return render('bind');
                }
                if (res.code != 1) {
                    return msg(res);
                }
                //TODO：显示登录成功页面
                render('success');
                //延迟加载手动刷新
                setTimeout(function () {
                    $('#update').click();
                },100);
                return setToken(option.type, res.data.token);
            };
            if (option.type=="chrome") {
                chrome.cookies.get({
                    url: "https://jd.com",
                    name: "unick",
                }, function (cookie) {
                    let shopName = "";
                    try{
                        let value = cookie.value;
                        shopName = decodeURI(value);
                    }catch(err){}
                    runtime.sendMessage({ port: { name: "login", data: { mphone: mphone, password: password, shopName } } }, callback);
                })
            } else {
                browser.cookies.get({
                    url: "https://jd.com",
                    name: "unick",
                }).then(function (cookie) {
                    let shopName = "";
                    try {
                        let value = cookie.value;
                        shopName = decodeURI(value);
                    } catch (err) { }
                    runtime.sendMessage({ port: { name: "login", data: { mphone: mphone, password: password, shopName } } }).then(callback);
                })
            }
        });
    };

    document.getElementById('account').onkeydown = function (event) {
        let e = event || window.event;
        console.log(e.keyCode);
        if (e.keyCode === 13) {
            document.getElementById('submit').click();
        }
    };
    document.getElementById('pwd').onkeydown = function (event) {
        let e = event || window.event;
        if (e.keyCode === 13) {
            document.getElementById('submit').click();
        }
    };
    //监听手动更新按钮
    document.getElementById('update').onclick = function () {

        //显示等待效果
        $('.jdmhLoading').show();

        /**
         * 手动更新时，判断登录状态是否过期
         */
        getCookie({type: option.type, tab: option.tab})
            .then(r => {
                if (!r || r.code != 1) {
                    return msg(r);
                }
                if (!r.data ) {
                    //TODO：点击【手动刷新】时，检测到登录状态过期，跳转未登录页面
                    render('login');
                    return msg({code: 0, msg: '登录状态过期，请重新登录'});
                }
                if (option.type == "chrome") {
                    return new Promise(resolve => {
                        tabs.sendMessage(option.tab.id, { method: "update" }, function (res) {
                            if (!res) {
                                return msg({ code: 0, msg: '手动刷新异常' });
                            }
                            return msg(res);
                        })
                    })
                } else if (option.type == "firefox") {
                    return tabs.sendMessage(option.tab.id, { method: "update" }).then(res=>{
                        if (!res) {
                            return msg({ code: 0, msg: '手动刷新异常' });
                        }
                        return msg(res);
                    });
                } else {
                    msg({code: 0, msg: '暂不支持当前浏览器'});
                }
            })
            .catch(err => {
                console.log(err);
                //TODO：无法获取登录状态，强制跳转登录界面，并提示错误信息
                render('login');
                return msg({code: 0, msg: '登录状态异常，请重新登录'});
            });
    };

    /**
     * 根据登录状态控制页面显示
     */
    if (!option.cookie ) {//未登录
        //TODO：打开插件时，显示未登录页面
        render('login');
    } else {
        //TODO：打开插件时，显示登录成功页面
        render('success');
    }

    return Promise.resolve(true);
};

/**
 * 获取页签对象
 * @param option
 */
let getTab = (option) => {
    if (!option || !option.type) {
        return Promise.reject({code: 0, msg: '暂不支持当前浏览器'});
    }

    if (tabs!=null) {
        let callback = function(tabs){
            if (!tabs || !tabs.length) {
                return { code: 0, msg: '请登录后在订单列表页操作' };
            }
            let tab = tabs[0];
            if (!tab || !tab.id || !tab.url || tab.url.indexOf(PATH) == -1) {
                return { code: 0, msg: '请登录后在订单列表页操作' };
            }
            return { code: 1, data: tab };
        }
        if(option.type=="firefox"){
            return tabs.query({ currentWindow: true, active: true })
                .then(callback)
        } else if(option.type=="chrome"){
            return new Promise((resolve)=>{
                tabs.query({ currentWindow: true, active: true }, function(tabs){
                    resolve(callback(tabs));
                });
            })
                
        } else {
            return Promise.reject({ code: 0, msg: '暂不支持当前浏览器' });
        }
    } else {
        return Promise.reject({code: 0, msg: '暂不支持当前浏览器'});
    }
};

/**
 * 获取登录状态
 * @param option
 * @by 贾少锋
 */
let getCookie = (option) => {
    if (!option || !option.type ) {
        return Promise.reject({code: 0, msg: '暂不支持当前浏览器'});
    }
    if (storage!=null) {
        return new Promise((resolve, reject) => {
            storage.local.get(COOKIE_NAME, function (json_cookie){
                if (!json_cookie || Object.keys(json_cookie).length ==0) {
                    return resolve({ code: 0, data: null });
                }
                //返回cookie对象
                return resolve({ code: 1, data: json_cookie });
            });
            
        });
    }  else {
        return Promise.reject({code: 0, msg: '暂不支持当前浏览器'});
    }
};


/**
 * 用户登录成功后将状态保存到本地
 * @param cookie：cookie信息
 * @by 贾少锋
 */
let setToken = (type, cookie) => {
    if ((type != 'chrome' && type != 'firefox') || !cookie ) {
        return msg({code: 0, msg: '登录状态保存失败'});
    }
    if (type == 'chrome') {
        let save = {};
        save[COOKIE_NAME] = cookie;
        chrome.storage.local.set(save, function () {
            msg({ code: 1, data: '登录状态保存成功' });
        });
    } else if (type == 'firefox') {
        browser.storage.local.set({ COOKIE_NAME: cookie }, function () {
            msg({ code: 1, data: '登录状态保存成功' });
        });
    } else {
        return msg({ code: 0, msg: '暂不支持当前浏览器' });
    }
};
let clearCookieName = function (callback) {
    if (storage != null) {
        storage.local.remove(COOKIE_NAME, function () {
            callback({ code: 1, data: '退出登录成功' });
        });
    } else {
        callback({ code: 0, msg: '暂不支持当前浏览器' });
    }
}
$("#logout").click(function(){
    clearCookieName(msg);
    window.location.reload();
});
/**
 * 插件启动时执行
 */
browserType()
    .then(r => {//判断浏览器
        
        //显示等待效果
        $('.jdmhLoading').show();

        if (!r || r.code != 1) {
            return Promise.reject({ code: 0, msg: r && r.msg || '系统异常' });
        }

        BT = r.data;//缓存浏览器内核

        return getTab({ type: BT });//获取页签对象
    })
    .then(r => {
        console.log("tab", r);
        if (!r || r.code != 1) {
            return show({ code: 0, msg: '请登录后在订单列表页操作' });
        }

        Tab = r.data;//缓存页签对象
        return extensionInfo({ type: BT, tab: Tab });//获取插件信息
    })
    .then(r => {
        console.log("extensionInfo", r);
        if (!r || r.code != 1 || !r.data) {
            return show({ code: 0, msg: '请登录后在订单列表页操作' });
        }

        if (r.data.update == 1) {//强制更新
            return show({ code: 0, msg: '请下载最新版本' });
        }

        show({ code: 1 });//显示页面

        return getCookie({ type: BT, tab: Tab });//获取登录状态
    })
    .then(r => {
        //console.log("cookie", r)
        if (!r || r.code != 1) {
            show({ code: 1, msg: '请登录后在订单列表页操作' });
        }else{
            Cookie = r.data;//缓存登录状态
        }
        return latestMsg({ type: BT, tab: Tab });//最新互动
    })
    .then(r => {
        console.log("latestMsg", r)
        if (!r || r.code != 1 || !r.data | !r.data.length) {
            return Promise.reject({ code: 0, msg: '无法获取最新互动信息' });
        }

        //TODO：渲染最新互动消息数据，例：r.data = [{"uid_name":"15010688367","jd_uid_name":"jd_15010688367","labels_name":"恶意打假"},{"uid_name":"15010688367","jd_uid_name":"jd_15010688367","labels_name":"抽检"}]
        render({ 'moveList': r.data });

        return otherOperation({ type: BT, cookie: Cookie, tab: Tab });//根据登录状态执行后续操作
    })
    .then(() => {
        console.log('初始化完成')

        //隐藏等待效果
        $('.jdmhLoading').hide();
    })
    .catch(err => {

        //隐藏等待效果
        $('.jdmhLoading').hide();

        if (err && typeof err.code == 'number') {
            return show(err);
        }
        console.log(err);
        return show({ code: 0, msg: '系统异常' });
    });

runtime.sendMessage({method:"order_list"}, function(details){
    console.log("order_list", details);
});