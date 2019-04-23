let cheerio = require('cheerio');
let slug = require('github-slugid');
let Config = require('./config.js');
const HeadingId = require('heading-id');

let calculater;

/**
 * 处理toc相关，同时处理标题和id
 * @param $
 * @param option
 * @param page
 * @returns {Array} 返回处理好的tocs合集
 */
function handlerTocs($, page, modifyHeader) {
    let config = Config.config;
    let tocs = [];

    let count = {
        h1: 0,
        h2: 0,
        h3: 0
    };
    let titleCountMap = {}; // 用来记录标题出现的次数
    let h1 = 0, h2 = 0, h3 = 0;
    $(':header').each(function (i, elem) {
        let header = $(elem);
        let id = addId(header, titleCountMap);
        let generatedAnchor=generateAnchorUsingMD5(header.text())
        if (id) {
            switch (elem.tagName) {
                case "h1":
                    handlerH1Toc(config, count, header, tocs, page.level, modifyHeader, generatedAnchor);
                    break;
                case "h2":
                    handlerH2Toc(config, count, header, tocs, page.level, modifyHeader, generatedAnchor);
                    break;
                case "h3":
                    handlerH3Toc(config, count, header, tocs, page.level, modifyHeader, generatedAnchor);
                    break;
                default:
                    titleAddAnchor(header, generatedAnchor);
                    break;
            }
        }
    });
    // 不然标题重写就没有效果，如果在外面不调用这句话的话
    page.content = $.html();
    return tocs;
}

/**
 * 处理锚点
 * @param header
 * @param titleCountMap 用来记录标题出现的次数
 * @returns {string}
 */
function addId(header, titleCountMap) {
    let id = header.attr('id') || slug(header.text());
    // header.attr("id", generateAnchorUsingMD5(header.text()));
    return id;
}

/**
 * 标题增加锚点效果
 * @param header
 * @param id
 */
function titleAddAnchor(header, url) {
    //header.prepend(`<a name=${url}></a>`)
    //header.prepend(`<a name=${url+'float'}></a>`)
    //header.prepend(`<div id=${url}></div>`)
    let originalId=header.attr('id')
    header.attr('id',url)
    header.attr('data-id', originalId)
    header.prepend('<a data-text="'+url + '" class="anchor-navigation-ex-anchor" '
        + 'href="#' + url + '">'
        + '<i class="fa fa-link" aria-hidden="true"></i>'
        + '</a>');
}

/**
 * 锚点使用 MD5 加签并取前8位
 * @param name
 */
function generateAnchorUsingMD5(name){
    return calculater.id(name)
}

/**
 * 处理h1
 * @param count 计数器
 * @param header
 * @param tocs 根节点
 */
function handlerH1Toc(config, count, header, tocs, pageLevel, modifyHeader,  generatedAnchor) {
    let title = header.text();
    let id = header.attr('id');
    let level = ''; //层级

    if (config.showLevel) {
        //层级显示仅在需要的时候处理
        count.h1 += 1;
        count.h2 = 0;
        count.h3 = 0;
        if (config.multipleH1) {
            level = count.h1 + '. ';
        } else {
            level = ' ';
        }
        // 是否与官网默认主题层级序号相关联
        if (config.associatedWithSummary && config.themeDefault.showLevel) {
            level = pageLevel + '.' + level;
        }
        if (!modifyHeader) {
            level  = '';
        }
        header.text(level + title); //重写标题
    }
    titleAddAnchor(header, generatedAnchor);
    tocs.push({
        name: title,
        level: level,
        url: generatedAnchor,
        children: []
    });
}

/**
 * 处理h2
 * @param count 计数器
 * @param header
 */
function handlerH2Toc(config, count, header, tocs, pageLevel, modifyHeader, generatedAnchor) {
    let title = header.text();
    let id = header.attr('id');
    let level = ''; //层级

    if (tocs.length <= 0) {
        //一级节点为空时，生成一个空的一级节点，让二级节点附带在这个上面
        // 在显示层级的时候不乱
        if (config.showLevel) {
            count.h1 += 1;
        }
        tocs.push({
            name: "",
            level: "",
            url: "",
            children: []
        });
    }

    let h1Index = tocs.length - 1;
    let h1Toc = tocs[h1Index];
    if (config.showLevel) {
        count.h2 += 1;
        count.h3 = 0;
        if (config.multipleH1) {
            level = (count.h1 + '.' + count.h2 + '. ');
        } else {
            level = (count.h2 + '. ');
        }
        if (config.associatedWithSummary && config.themeDefault.showLevel) {
            level = pageLevel + '.' + level;
        }
        if (!modifyHeader) {
            level  = '';
        }
        header.text(level + title); //重写标题
    }
    titleAddAnchor(header, generatedAnchor);
    h1Toc.children.push({
        name: title,
        level: level,
        url: generatedAnchor,
        children: []
    });
}

/**
 * 处理h3
 * @param count 计数器
 * @param header
 */
function handlerH3Toc(config, count, header, tocs, pageLevel, modifyHeader, generatedAnchor) {
    let title = header.text();
    let id = header.attr('id');
    let level = ''; //层级

    if (tocs.length <= 0) {
        //一级节点为空时，生成一个空的一级节点，让二级节点附带在这个上面
        if (config.showLevel) {
            count.h1 += 1;
        }
        tocs.push({
            name: "",
            level: "",
            url: "",
            children: []
        });
    }
    let h1Index = tocs.length - 1;
    let h1Toc = tocs[h1Index];
    let h2Tocs = h1Toc.children;
    if (h2Tocs.length <= 0) {
        //二级节点为空时，生成一个空的二级节点，让三级节点附带在这个上面
        if (config.showLevel) {
            count.h2 += 1;
        }
        h2Tocs.push({
            name: "",
            level: "",
            url: "",
            children: []
        });
    }
    let h2Toc = h1Toc.children[h2Tocs.length - 1];

    if (config.showLevel) {
        count.h3 += 1;
        if (config.multipleH1) {
            level = (count.h1 + '.' + count.h2 + '.' + count.h3 + '. ');
        } else {
            level = (count.h2 + '.' + count.h3 + '. ');
        }
        if (config.associatedWithSummary && config.themeDefault.showLevel) {
            level = pageLevel + "." + level;
        }
        if (!modifyHeader) {
            level  = '';
        }
        header.text(level + title); //重写标题
    }
    titleAddAnchor(header, generatedAnchor);
    h2Toc.children.push({
        name: title,
        level: level,
        url: generatedAnchor,
        children: []
    });
}

/**
 * 处理浮动导航：拼接锚点导航html，并添加到html末尾，利用css 悬浮
 * @param tocs
 * @returns {string}
 */
function handlerFloatNavbar($, tocs) {
    let config = Config.config;
    let float = config.float;
    let floatIcon = float.floatIcon;
    let level1Icon = '';
    let level2Icon = '';
    let level3Icon = '';
    if (float.showLevelIcon) {
        level1Icon = float.level1Icon;
        level2Icon = float.level2Icon;
        level3Icon = float.level3Icon;
    }

    let html = "<div id='anchor-navigation-ex-navbar'><i class='" + floatIcon + "'></i><ul>";
    for (let i = 0; i < tocs.length; i++) {
        let h1Toc = tocs[i];
        if (h1Toc.name){
            html += "<li><span class='title-icon " + level1Icon + "'></span><a href='#" + h1Toc.url+'float' + "'><b>" + h1Toc.level + "</b>" + h1Toc.name + "</a></li>";
        }
        if (h1Toc.children.length > 0) {
            html += "<ul>"
            for (let j = 0; j < h1Toc.children.length; j++) {
                let h2Toc = h1Toc.children[j];
                if(h2Toc.name){
                    html += "<li><span class='title-icon " + level2Icon + "'></span><a href='#" + h2Toc.url + "'><b>" + h2Toc.level + "</b>" + h2Toc.name + "</a></li>";
                }
                if (h2Toc.children.length > 0) {
                    html += "<ul>";
                    for (let k = 0; k < h2Toc.children.length; k++) {
                        let h3Toc = h2Toc.children[k];
                        html += "<li><span class='title-icon " + level3Icon + "'></span><a href='#" + h3Toc.url + "'><b>" + h3Toc.level + "</b>" + h3Toc.name + "</a></li>";
                    }
                    html += "</ul>";
                }
            }
            html += "</ul>"
        }
    }
    html += "</ul></div>";
    return html;
}

function handlerPageTopNavbar($, tocs) {
    return buildTopNavbar($, tocs)
}

function buildTopNavbar($, tocs) {
    let config = Config.config;
    let pageTop = config.pageTop;
    let level1Icon = '';
    let level2Icon = '';
    let level3Icon = '';
    if (pageTop.showLevelIcon) {
        level1Icon = pageTop.level1Icon;
        level2Icon = pageTop.level2Icon;
        level3Icon = pageTop.level3Icon;
    }

    let html = "<div id='anchor-navigation-ex-pagetop-navbar'><ul>";
    for (let i = 0; i < tocs.length; i++) {
        let h1Toc = tocs[i];
        if(h1Toc.name){
            html += "<li><span class='title-icon " + level1Icon + "'></span><a href='#" + h1Toc.url + "'><b>" + h1Toc.level + "</b>" + h1Toc.name + "</a></li>";
        }
        if (h1Toc.children.length > 0) {
            html += "<ul>"
            for (let j = 0; j < h1Toc.children.length; j++) {
                let h2Toc = h1Toc.children[j];
                if(h2Toc.name){
                    html += "<li><span class='title-icon " + level2Icon + "'></span><a href='#" + h2Toc.url + "'><b>" + h2Toc.level + "</b>" + h2Toc.name + "</a></li>";
                }
                if (h2Toc.children.length > 0) {
                    html += "<ul>";
                    for (let k = 0; k < h2Toc.children.length; k++) {
                        let h3Toc = h2Toc.children[k];
                        html += "<li><span class='title-icon " + level3Icon + "'></span><a href='#" + h3Toc.url + "'><b>" + h3Toc.level + "</b>" + h3Toc.name + "</a></li>";
                    }
                    html += "</ul>";
                }
            }
            html += "</ul>"
        }
    }

    html += "</ul></div>";

    return html;
}

/**
 * 添加返回顶部按钮
 * @param tocs
 * @returns {string}
 */
function buildGoTop(tocs) {
    let config = Config.config;
    let html = "";
    if (config.showGoTop && tocs && tocs.length > 0) {
        html = "<a href='#" + tocs[0].url + "' id='anchorNavigationExGoTop'><i class='fa fa-arrow-up'></i></a>";
    }
    return html;
}

function start(bookIns, page) {

    calculater = new HeadingId();
    let $ = cheerio.load(page.content);
    let modifyHeader = !/<!--[ \t]*ex_nolevel[ \t]*-->/.test(page.content)

    // 处理toc相关，同时处理标题和id
    let tocs = handlerTocs($, page, modifyHeader);

    // 设置处理之后的内容
    if (tocs.length == 0) {
        page.content = $.html();
        return;
    }
    let html = "";
    if (!/<!--[ \t]*ex_nonav[ \t]*-->/.test(page.content)) {
        let config = Config.config;
        let mode = config.mode;
        if (mode == 'float') {
            // html = handlerFloatNavbar($, tocs);
        } else if (mode == 'pageTop') {
            html = handlerPageTopNavbar($, tocs);
        }
    }
    html += buildGoTop(tocs);
    page.content = html + $.html();
    let $x = cheerio.load(page.content);
    $x('extoc').replaceWith($x(buildTopNavbar($, tocs, page)));
    page.content = $x.html();
}

module.exports = start;
