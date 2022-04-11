document.getElementById("username-submit").addEventListener("click",(e)=>{
e.preventDefault();
const username = document.getElementById("username-input").value;
console.log(username);
console.log(origin);
console.log(window.href);
location.href= origin+"/conference.html"+"?username="+username;
})