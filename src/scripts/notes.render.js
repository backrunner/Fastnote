var storage = require('electron-json-storage');

//保存所有的notes
var notes = new Array();

var selectModeEnabled = false;
//存放长按的setTimeout
var noteLongClickTimeout;

var notes_selected = new Array();

var sort_mode = null;
//初始化排序模式
storage.get('sortMode' + (typeof inRecyclebin != 'undefined' && inRecyclebin ? '_recyclebin' : ''), function (err, data) {
    if (err) {
        console.log(err);
        sort_mode = 'id'; //设置为默认值
        return;
    }
    sort_mode = data.mode;
});
//显示没有笔记的界面
function showNoteEmpty() {
    var note_empty = document.getElementsByClassName('note-empty')[0];
    var note_list = document.getElementsByClassName('note-list')[0];
    note_empty.setAttribute("style", "display:flex;");
    note_list.setAttribute("style", "display:none;");
}

function showNoteEmpty_Anim() {
    $('.note-empty').css('display', 'flex');
    $('.note-empty').animateCss('fadeIn');
    var note_list = document.getElementsByClassName('note-list')[0];
    note_list.setAttribute("style", "display:none;");
}
//显示有笔记的界面
function showNoteList() {
    var note_empty = document.getElementsByClassName('note-empty')[0];
    var note_list = document.getElementsByClassName('note-list')[0];
    note_empty.setAttribute("style", "display:none;");
    note_list.setAttribute("style", "display:block;");
}
//清空列表内的笔记DOM
function clearNoteList() {
    var note_list_forceTop = document.getElementById('note-list-forceTop');
    var note_list_normal = document.getElementById('note-list-normal');
    if (typeof note_list_forceTop != 'undefined' && note_list_forceTop != null) { //if用来兼容recyclebin
        note_list_forceTop.innerHTML = "";
    }
    note_list_normal.innerHTML = "";
    selectModeEnabled = false; //刷新页面/列表时重置多选开关
}

//定义url过滤正则
var reg_url = /(http|ftp|https|mailto):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/gi;

//渲染一条笔记
function renderNote(id, time, updatetime, title, text, forceTop) {
    var html = '<div class="note-wrapper"><div class="note' + (typeof forceTop != 'undefined' ? forceTop ? " note-forceTop" : "" : "") + '" id="note_' + id +
        '" data-id="' + id + '"><div class="note-header"><span class="note-no">';
    html += '#' + id + '</span>';
    //渲染note-title
    var titletext = "";
    if (typeof title != 'undefined'){
        if (title.length > 50){
            titletext = '<titlep1>'+insert_spacing(title.substring(0,16), 0.12)+'</titlep1><titlesusp1>...</titlesusp1><titlep2>'+insert_spacing(title.substring(18,32),0.12)+'</titlep2><titlesusp2>...</titlesusp2><titlep3>'+insert_spacing(title.substring(32,50),0.12)+'</titlep3><titlesusp3>...</titlesusp3><titlep4>'+insert_spacing(title.substring(50),0.12)+'</titlep4>';
        } else if (title.length>32){
            titletext = '<titlep1>'+insert_spacing(title.substring(0,16), 0.12)+'</titlep1><titlesusp1>...</titlesusp1><titlep2>'+insert_spacing(title.substring(18,32),0.12)+'<titlesusp2>...</titlesusp2><titlep3>'+insert_spacing(title.substring(32),0.12)+'</titlep3>';
        } else if (title.length>16){
            titletext = '<titlep1>'+insert_spacing(title.substring(0,16), 0.12)+'</titlep1><titlesusp1>...</titlesusp1><titlep2>'+insert_spacing(title.substring(18), 0.12)+'</titlep2>';
        } else {
            titletext = insert_spacing(title,0.12);
        }
    }
    html += '<span class="note-title">'+titletext+'</span>';
    //选择性显示时间
    if (typeof forceTop != 'undefined' && typeof inRecyclebin == 'undefined') {
        if (forceTop) {
            html += '<i class="fa fa-caret-up note-forceTop-icon" aria-hidden="true"></i>';
        }
    }
    if (typeof (updatetime) != 'undefined') {
        html += '<time><p class="note-time note-updatetime han-element"><span class="note-updatetime-label">更新：</span>' + updatetime + '</p>';
        html += '<p class="note-time note-createtime han-element"><span class="note-createtime-label">创建：</span>' + time + '</p></time>';
    } else {
        html += '<time><p class="note-time han-element">' + time + '</p></time>';
    }
    html += '</div><div class="note-content"><p class="note-text">';
    //process html tag
    temp = text.split('<br/>');
    final_text = "";
    for (var i = 0; i < temp.length; i++) {
        s = $("#filter-x").text(temp[i]).html().replace(' ', '&nbsp;');
        final_text += s;
        final_text += "<br/>";
    }
    text = final_text;
    text = insert_spacing(text, 0.15);
    //自动识别网页
    html += text.replace(reg_url, function (result) {
        return '<a href="' + result + '">' + result + '</a>';
    });
    html += '</p></div></div></div>';
    if (typeof forceTop != 'undefined' && typeof inRecyclebin == 'undefined') {
        if (forceTop) {
            $('.note-list-forceTop').append($(html));
        } else {
            $('.note-list-normal').append($(html));
        }
    } else {
        $('.note-list-normal').append($(html));
    }
    bindNoteFoldDBL(id);
    //open external on os default webbrowser
    $('#note_' + id + ' a').click(function (e) {
        ipcRenderer.send('openExternalURL', $(this).attr('href'));
        e.preventDefault();
    });
}
//在顶部渲染Note
function renderNoteAtTop(id, time, updatetime, title, text, forceTop) {
    //构造html
    var html = '<div class="note-wrapper"><div class="note' + (typeof forceTop != 'undefined' ? forceTop ? " note-forceTop" : "" : "") + '" id="note_' + id +
        '" data-id="' + id + '"><div class="note-header"><span class="note-no">';
    html += '#' + id + '</span>';
    //渲染note-title
    var titletext = "";
    if (typeof title != 'undefined'){
        if (title.length > 50){
            titletext = '<titlep1>'+insert_spacing(title.substring(0,16), 0.12)+'</titlep1><titlesusp1>...</titlesusp1><titlep2>'+insert_spacing(title.substring(18,32),0.12)+'</titlep2><titlesusp2>...</titlesusp2><titlep3>'+insert_spacing(title.substring(32,50),0.12)+'</titlep3><titlesusp3>...</titlesusp3><titlep4>'+insert_spacing(title.substring(50),0.12)+'</titlep4>';
        } else if (title.length>32){
            titletext = '<titlep1>'+insert_spacing(title.substring(0,16), 0.12)+'</titlep1><titlesusp1>...</titlesusp1><titlep2>'+insert_spacing(title.substring(18,32),0.12)+'<titlesusp2>...</titlesusp2><titlep3>'+insert_spacing(title.substring(32),0.12)+'</titlep3>';
        } else if (title.length>16){
            titletext = '<titlep1>'+insert_spacing(title.substring(0,16), 0.12)+'</titlep1><titlesusp1>...</titlesusp1><titlep2>'+insert_spacing(title.substring(18), 0.12)+'</titlep2>';
        } else {
            titletext = insert_spacing(title,0.12);
        }
    }
    html += '<span class="note-title">'+titletext+'</span>';
    //置顶标志
    if (typeof forceTop != 'undefined' && typeof inRecyclebin == 'undefined') {
        if (forceTop) {
            html += '<i class="fa fa-caret-up note-forceTop-icon" aria-hidden="true"></i>';
        }
    }
    //选择性显示时间
    if (typeof (updatetime) != 'undefined') {
        html += '<time><p class="note-time note-updatetime han-element"><span class="note-updatetime-label">更新：</span>' + updatetime + '</p>';
        html += '<p class="note-time note-createtime han-element"><span class="note-createtime-label">创建：</span>' + time + '</p></time>';
    } else {
        html += '<time><p class="note-time han-element">' + time + '</p></time>';
    }
    html += '</div><div class="note-content"><p class="note-text">';

    temp = text.split('<br/>');
    final_text = "";
    for (var i = 0; i < temp.length; i++) {
        s = $("#filter-x").text(temp[i]).html().replace(' ', '&nbsp;');
        final_text += s;
        final_text += "<br/>";
    }
    text = final_text;

    text = insert_spacing(text, 0.15);
    //自动识别网页
    html += text.replace(reg_url, function (result) {
        return '<a href="' + result + '">' + result + '</a>';
    });
    html += '</p></div></div></div>';
    //置顶
    if (typeof forceTop != 'undefined' && typeof inRecyclebin == 'undefined') {
        if (forceTop) {
            $('.note-list-forceTop').prepend($(html));
        } else {
            $('.note-list-normal').prepend($(html));
        }
    } else {
        $('.note-list-normal').prepend($(html));
    }
    //auto fold
    bindNoteFoldDBL(id);
    //animate
    $('#note_' + id).animateCss('fadeInLeft');
    //open external on os default webbrowser
    $('#note_' + id + ' a').click(function (e) {
        ipcRenderer.send('openExternalURL', $(this).attr('href'));
        e.preventDefault();
    });
}

//绑定note的双击折叠
function bindNoteFoldDBL(id) {
    if ($('#note_' + id + ' .note-content').height() > 250) {
        $('#note_' + id + ' .note-content').addClass("note-overheight"); //process css
        $('#note_' + id + ' .note-content').dblclick(function (e) {
            //process double click
            if ($('#note_' + id + ' .note-content').height() > 250) {
                $('#note_' + id + ' .note-content').animate({
                    height: "250px"
                });
                $('#note_' + id + ' .note-content').addClass("note-overheight");
            } else {
                $('#note_' + id + ' .note-content').css('height', 'auto');
                var animate_height = $('#note_' + id + ' .note-content').height();
                $('#note_' + id + ' .note-content').css('height', '250px');
                $('#note_' + id + ' .note-content').animate({
                    height: animate_height
                });
                $('#note_' + id + ' .note-content').removeClass("note-overheight");
            }
        });
        //在双击折叠/展开时不选中文本
        $('#note_' + id + ' .note-content p').mousedown(function (e){
            if (e.detail > 1){
                e.preventDefault();
            }
        });
    } else {
        $('#note_' + id + ' .note-content').removeClass("note-overheight");
    }
}

//添加笔记至Array
function addNoteToArray(id, time, rawtime, updatetime, updaterawtime, title, text, offset, timezone, forceTop) {
    var note = {
        id: id,
        time: time,
        rawtime: rawtime,
        updatetime: updatetime,
        updaterawtime: updaterawtime,
        title: title,
        text: text,
        offset: offset,
        timezone: timezone,
        forceTop: forceTop
    };
    notes.push(note);
}

//添加Note Obj至Array
function addNoteObjToArray(note) {
    notes.push(note);
}

//刷新note-list
function refreshNoteList(callback) {
    clearNoteList(); //先清空
    if (typeof sort_mode != 'string') {
        storage.get('sortMode' + (typeof inRecyclebin != 'undefined' && inRecyclebin ? '_recyclebin' : ''), function (err, data) {
            if (err) {
                console.error(err);
                return;
            }
            sort_mode = data.mode;
            if (typeof sort_mode != 'string') {
                sort_mode = 'id';
            }
            sortNotes(sort_mode); //排序
            for(var i=0;i<notes.length;i++){
                renderNote(notes[i].id, notes[i].time, notes[i].updatetime, notes[i].title, notes[i].text, notes[i].forceTop);
            }
            //绑定Note的点击事件
            bindNoteClickEvent();
            //callback
            if (typeof (callback) === 'function') {
                callback();
            }
        });

    } else {
        sortNotes(sort_mode); //排序
        for(var i=0;i<notes.length;i++){
            renderNote(notes[i].id, notes[i].time, notes[i].updatetime, notes[i].title, notes[i].text, notes[i].forceTop);
        }
        //绑定Note的点击事件
        bindNoteClickEvent();
        //callback
        if (typeof (callback) === 'function') {
            callback();
        }
    }
}

//清空notes数组
function clearNoteArray() {
    notes = new Array();
}

//排序笔记
function sortNotes(mode) {
    switch (mode) {
        default:
        case 'id':
            notes.sort(sortNotesById);
            break;
        case 'updateDate':
            notes.sort(sortNotesByUpdateDate);
            break;
    }
}

function sortNotesById(a, b) {
    if (a.id > b.id) {
        return -1;
    } else if (a.id < b.id) {
        return 1;
    } else {
        return 0;
    }
}

function sortNotesByUpdateDate(a, b) {
    var temp_a = typeof a.updaterawtime != 'undefined' ? a.updaterawtime : a.rawtime;
    var temp_b = typeof b.updaterawtime != 'undefined' ? b.updaterawtime : b.rawtime;
    if (temp_a > temp_b) {
        return -1;
    } else if (temp_a < temp_b) {
        return 1;
    } else {
        return 0;
    }
}

//从数组中删除一项
function deleteNoteFromArr(id) {
    notes.every(function (note, i) {
        if (note.id == id) {
            notes.splice(i, 1);
            return false;
        }
        return true; //every是true继续循环 false跳出
    });
}

function forceTopNote(noteid) {
    notes.every(function (note, i) {
        if (note.id == noteid) {
            //处理note文件
            note.forceTop = true;
            saveNoteByObj(note);
            return false;
        } else {
            return true;
        }
    });
    refreshNoteList();
}

function removeForceTopNote(noteid) {
    notes.every(function (note, i) {
        if (note.id == noteid) {
            //处理note文件
            note.forceTop = false;
            saveNoteByObj(note);
            return false;
        } else {
            return true;
        }
    });
    refreshNoteList();
}