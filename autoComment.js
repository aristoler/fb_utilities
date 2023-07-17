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

