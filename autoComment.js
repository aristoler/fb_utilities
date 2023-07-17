function withJquery(){
  console.time('time1');
	var temp = $("<input>");
  $("body").append(temp);
 temp.val("$('#copyText1').text()").select();
  document.execCommand("copy");
  temp.remove();
    console.timeEnd('time1');
}

function withoutJquery(){
   console.time('time2');
	var temp=document.createElement('input');
  var texttoCopy=document.getElementById('copyText2').innerHTML;
  temp.type='input';
  temp.setAttribute('value',texttoCopy);
  document.body.appendChild(temp);
    temp.select();
  document.execCommand("copy");
  temp.remove();
   console.timeEnd('time2');
}

function copyToClipBoard(text){
    var temp = $("<input>");
    $("body").append(temp);
    temp.val(text).select();
    document.execCommand("copy");
    temp.remove();
}

function copyToClipBoard2(text){
  var temp=document.createElement('input');
  temp.type='input';
  temp.setAttribute('value',text);
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  temp.remove();
}




'可以focus
var evt = new Event("click", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"]")[0].dispatchEvent(evt);


'可以focus
var evt = new Event("focus", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"]")[0].dispatchEvent(evt);

'开始输入状态
var evt = new Event("compositionstart", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"]")[0].dispatchEvent(evt);

var evt = new Event("compositionend", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"]")[0].dispatchEvent(evt);

'
var evt = new Event("beforeinput", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"]")[0].dispatchEvent(evt);

'开始输入状态
var evt = new Event("compositionend", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"]")[0].dispatchEvent(evt);


'开始输入状态
var evt = new Event("input", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"]")[0].dispatchEvent(evt);

$($("div[role=\"textbox\"]")[0]).replaceWith($($("div[role=\"textbox\"]")[0]).clone());

<span data-lexical-text="true">好</span>

#focused-state-composer-submit > span > div > i



$("div[role=\"textbox\"]")[0]
.addEventListener('drop', (event) => {
  event.dataTransfer.setData('Text', 'Foo bar');
  console.log("in here");
});



    function v(d, b) {
        d.preventDefault();
        b.update(function() {
            var c = require("Lexical").$getSelection()
              , e = d.clipboardData;
            null != e && require("Lexical").$isRangeSelection(c) && require("LexicalClipboard").$insertDataTransferForPlainText(e, c);
        }, {
            tag: "paste"
        });
    }
	
	
function copyToClipBoard2(text){
  var temp=document.createElement('input');
  temp.type='input';
  temp.setAttribute('value',"ddd");
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  temp.remove();
  
  
var evt = new Event("beforeinput", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

var evt = new Event("input", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

  
var evt = new Event("compositionstart", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

  var evt = new Event("paste", { bubbles: true, cancelable: false });
  $("div[role=\"textbox\"]")[0].dispatchEvent(evt);
  
  var evt = new Event("compositionend", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"]")[0].dispatchEvent(evt);

}

  var evt = new Event("keydown", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"]")[0].dispatchEvent(evt);

const el = $("div[role=\"textbox\"]")[0];
const selection = window.getSelection();
const range = document.createRange();
selection.removeAllRanges();
range.selectNodeContents(el);
range.collapse(false);
selection.addRange(range);

var evt = new Event("focus", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"] p")[0].dispatchEvent(evt);

el.focus();

(function(){
var el = $("div[role=\"textbox\"]")[0];
var range,selection;
selection = window.getSelection();
range = document.createRange();
range.selectNodeContents(el);
selection.removeAllRanges();
selection.addRange(range);
console.log("selection");

//focus
var evt = new Event("focus", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

var evt = new Event("keydown", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

var evt = new Event("beforeinput", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

var evt = new Event("input", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);


//"<p><span data-lexical-text=\"true\">好看</span></p>";
$("div[role=\"textbox\"]")[0].innerHTML = "<p><span data-lexical-text=\"true\">好看</span></p>";

var evt = new Event("compositionstart", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

$("div[role=\"textbox\"] p span")[0].innerText = "ccc";
	
var evt = new Event("compositionend", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

// var evt = new Event("blur", { bubbles: true, cancelable: false });
// el.dispatchEvent(evt);

// $("#focused-state-composer-submit > span > div > i").trigger("click");
})();


$($("div[role=\"textbox\"]")[0]).replaceWith($($("div[role=\"textbox\"]")[0]).clone());

$("div[role=\"textbox\"] p span").text("ccc")


$("div[role=\"textbox\"] p")[0].innerText= 123

(function(){
var el = $("div[role=\"textbox\"]")[0];
var evts = ['click'];
evts.forEach(function(a){
console.log(a);
el.removeEventListener(a);
});
})();



  
  var evt = new Event("focus", { bubbles: true, cancelable: false });
$("div[role=\"textbox\"]")[0].dispatchEvent(evt);





    var el = jQuery("div[role=\"textbox\"]")[0];
    var range = document.createRange();
    var sel = window.getSelection();
    range.setStart(el.childNodes[0].childNodes[0], 0);
	range.setEnd(el.childNodes[0].childNodes[0], 0);
    // range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

var evt = new Event("focus", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);



(function(){
var el = jQuery("div[role=\"textbox\"]")[0];
var range,selection;
selection = window.getSelection();
range = document.createRange();
// range.selectNodeContents(el);
range.setStart(jQuery("div[role=\"textbox\"] p")[0].childNodes[0], 0);
selection.removeAllRanges();
selection.addRange(range);
console.log("selection");

//focus
var evt = new Event("focus", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);



var evt = new Event("beforeinput", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

var evt = new Event("input", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);



var evt = new Event("compositionstart", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);


var evt = new  KeyboardEvent('keydown', {bubbles: true, cancelable: false, 'keyCode': 'a'});
el.dispatchEvent(evt);


var evt = new Event("compositionend", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

var evt = new Event("change", { bubbles: true, cancelable: false });
el.dispatchEvent(evt);

// $("#focused-state-composer-submit > span > div > i").trigger("click");
})();





(function(){
var el = jQuery("div[role=\"textbox\"]")[0];
var range,selection;
selection = window.getSelection();

range = document.createRange();
// range.selectNodeContents(el);
range.setStart(el.childNodes[0], 1)
// range.collapse(true)


selection.removeAllRanges();
selection.addRange(range);
console.log("selection");

//focus
// var evt = new Event("focus", { bubbles: true, cancelable: false });
// el.dispatchEvent(evt);


// var evt = new Event("compositionstart", { bubbles: true, cancelable: false });
// el.dispatchEvent(evt);
})();
