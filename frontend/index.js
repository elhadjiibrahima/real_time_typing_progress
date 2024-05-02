const postsContainer = document.querySelector('.posts-container');
const createPostContainer = document.querySelector(".create-post-container");
const postContainer = document.querySelector(".post-container");
const contentWrapper = document.querySelector('.content-wrapper');
const registerContainer = document.querySelector('.register-container');
const signinContainer = document.querySelector('.signin');
const signupNav = document.querySelector('.signup-nav');
const logoutNav = document.querySelector('.logout-nav');
const onlineUsers = document.querySelector('.online-users');
const offlineUsers = document.querySelector('.offline-users');
const commentsContainer = document.querySelector('.comments-container');
const topPanel = document.querySelector('.top-panel');
const newPostNotif= document.querySelector('.new-post-notif-wrapper');
const msgNotif = document.querySelector(".msg-notification");

let counter = 0
var unread = []

var conn;
var currId = 0
var currUsername = ""
var currPost = 0

var allPosts = []
var filteredPosts = []

var allUsers = []
var online = []

var currComments = []

//POST fetch function
async function postData(url = '', data = {}) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    console.log('posted')

    return response.json()
}

  

//GET fetch function
async function getData(url = '') {
    console.log('getting', url)
    const response = await fetch(url, {
        method: 'GET'
    })

    return response.json()
}


async function getPosts() {
    await getData('http://localhost:8000/post')
    .then(value => {
        allPosts = value
    }).catch(err => {
        console.log(err)
    })
}

async function getUsers() {
    await getData('http://localhost:8000/user')
    .then(value => {
        allUsers = value
    }).catch(err => {
        console.log(err)
    })
}

  
  

async function getComments(post_id) {
    await getData('http://localhost:8000/comment?param=post_id&data='+post_id)
    .then(value => {
        currComments = value
    }).catch(err => {
        console.log(err)
    })
}

async function updateUsers() {
    await getData('http://localhost:8000/chat?user_id=' + currId)
        .then(value => {
            var newUsers = []

            if (value.user_ids != null) {
                newUsers = value.user_ids.map((i) => {
                    return allUsers.filter(u => u && u.id == i)[0]
                })
            }

            let otherUsers = allUsers.filter(x => !newUsers.includes(x))

            allUsers = newUsers.concat(otherUsers)

            createUsers(allUsers, conn)
        }).catch(err => {
            console.log(err)
        })
}


function startWS() {
    if (window["WebSocket"]) {
        conn = new WebSocket("ws://" + document.location.host + "/ws");

        conn.onopen = function() {
            console.log("WebSocket connection is open");
            createUsers(allUsers, conn);
        };

        conn.onclose = function(evt) {
            // Handle WebSocket connection close
            console.log("WebSocket connection is closed");
        };

        conn.onmessage = function(evt) {
            var data = JSON.parse(evt.data);
            // console.log(data);

            if (data.msg_type === "msg") {
                // Handle message logs
                var senderContainer = document.createElement("div");
                var sender = document.createElement("div");
                var date = document.createElement("div");
                
                if (data.sender_id == currId) {
                    // Message envoyé par l'utilisateur actuel
                    senderContainer.className = "sender-container";
                    sender.className = "sender";
                } else {
                    // Message reçu d'un autre utilisateur
                    senderContainer.className = "receiver-container";
                    sender.className = "receiver";
                }
                
                sender.innerText = data.content;
                date.className = "chat-time";
                date.innerText = data.date.slice(0, -3);
                
                appendLog(senderContainer, sender, date);

                if (data.sender_id !== currId) {
                    // Mettre à jour la liste des messages non lus
                    let unreadMsgs = unread.filter((u) => u[0] == data.sender_id);
                    if (document.querySelector('.chat-wrapper').style.display == "none") {
                        if (unreadMsgs.length == 0) {
                            unread.push([data.sender_id, 1]);
                        } else {
                            unreadMsgs[0][1] += 1;
                        }
                    }
                }

                updateUsers();
            } else if (data.msg_type === "online") {
                // Handle online status updates
                online = data.user_ids;
                console.log(data.user_ids);
                getUsers().then(function() {
                    updateUsers();
                });
            } else if (data.msg_type === "post") {
                // Handle post notifications
                newPostNotif.style.display = "flex";
            } else if (data.msg_type === "") {
                // Récupérer l'élément contenant le nom d'utilisateur
      
                // Handle typing status updates
                if (data.receiver_id === currId ) {
                    // Show typing indicator only to the current user
                    if (data.is_typing) {
                        console.log("User " + data.sender_id + " started typing");
                        document.querySelector("#typing-indicator").style.display = "block";
                        document.querySelector("#typing-text").textContent = "is typing";
                        var typingInterval = 2000; 
                        animateDots(typingInterval);
                    } else {
                        console.log("User " + data.sender_id + " stopped typing");
                        document.querySelector("#typing-indicator").style.display = "none";
                    }
                }
            }
        };
    } else {
        var item = document.createElement("div");
        item.innerHTML = "<b>Your browser does not support WebSockets.</b>";
        appendLog(item);
    }
}



window.addEventListener('DOMContentLoaded', async function() {
    await getPosts();
    await getUsers();

    document.querySelector('.chat-wrapper').style.display = "none";

    let sess;
    try {
        sess = await postData('http://localhost:8000/session');
    } catch (error) {
        console.log("Session cookie not found or expired");
        return;
    }

    let vals = sess.msg.split("|");
    currId = parseInt(vals[0]);
    currUsername = vals[1];

    signinContainer.style.display = "none";
    signupNav.style.display = "none";
    contentWrapper.style.display = "flex";
    logoutNav.style.display = "flex";

    document.querySelector('.profile').innerText = currUsername;
    startWS();

    createPosts(allPosts);
    updateUsers();
});

function createPost(postdata) {

    document.querySelector('#title').innerText = postdata.title.slice(0, 10)
    document.querySelector('#username').innerHTML = allUsers.filter(u => {return u.id == postdata.user_id})[0].username
    document.querySelector('#date').innerHTML = (postdata.date).slice(0, -3)
    document.querySelector('.category').innerHTML = postdata.category
    document.querySelector('.full-content').innerText = postdata.content
    document.getElementById('post-likes').innerHTML = postdata.likes
    document.getElementById('post-dislikes').innerHTML = postdata.dislikes
}

function createComments(commentsdata) {
    commentsContainer.innerHTML = ""
    if (commentsdata == null) {
        return
    }

    commentsdata.map(({id, post_id, user_id, content, date}) =>{
        var commentWrapper = document.createElement("div");
        commentWrapper.className = "comment-wrapper"
        commentsContainer.appendChild(commentWrapper)
        var userImg = document.createElement("img");
        userImg.src = "./frontend/assets/profile7.svg"
        commentWrapper.appendChild(userImg)
        var comment = document.createElement("div");
        comment.className = "comment"
        commentWrapper.appendChild(comment)
        var commentUserWrapper = document.createElement("div");
        commentUserWrapper.className = "comment-user-wrapper"
        comment.appendChild(commentUserWrapper)
        var commentUsername = document.createElement("div");
        commentUsername.className = "comment-username"
        commentUsername.innerText = allUsers.filter(u => {return u.id == user_id})[0].username
        commentUserWrapper.appendChild(commentUsername)
        var commentDate = document.createElement("div");
        commentDate.className = "comment-date"
        commentDate.innerHTML = date.slice(0, -3)
        commentUserWrapper.appendChild(commentDate)
        var commentSpan = document.createElement("div");
        commentSpan.innerText = content
        comment.appendChild(commentSpan)
    })
}

function createPosts(postdata) {
    postsContainer.innerHTML = ""

    if (postdata == null) {
        return
    }

    postdata.map(async ({id, user_id, category, title, content, date, likes, dislikes}) => {
        await getComments(id)

        var post = document.createElement("div");
        post.className = "post"
        post.setAttribute("id", id)
        postsContainer.appendChild(post)
        var posttitle = document.createElement("div");
        posttitle.className = "title"
        posttitle.innerText = title.slice(0, 10)
        post.appendChild(posttitle)
        var author = document.createElement("div");
        author.className = "author"
        post.append(author)
        var img = document.createElement("img");
        img.src = "./frontend/assets/profile7.svg"
        author.appendChild(img)
        var user = document.createElement("div");
        user.className = "post-username"
        user.innerHTML = allUsers.filter(u => {return u.id == user_id})[0].username
        author.appendChild(user)
        var postdate = document.createElement("div");
        postdate.className = "date"
        postdate.innerText = date.slice(0, -3)
        author.appendChild(postdate)
        var postcontent = document.createElement("div");
        postcontent.className = "post-body"
        postcontent.innerText = content
        post.append(postcontent)  
        var commentsWrapper = document.createElement("div");
        commentsWrapper.className = "comments-wrapper"
        post.appendChild(commentsWrapper)
        var likesDislikesWrapper = document.createElement("div");
        likesDislikesWrapper.className = "likes-dislikes-wrapper"
        commentsWrapper.appendChild(likesDislikesWrapper)
        var likesWrapper = document.createElement("div");
        likesWrapper.className = "likes-wrapper"
        likesDislikesWrapper.appendChild(likesWrapper)
        var likesImg = document.createElement("img");
        likesImg.src = "./frontend/assets/like3.svg"
        likesWrapper.appendChild(likesImg)
        var postlikes = document.createElement("div");
        postlikes.className = "likes"
        postlikes.innerText = likes
        likesWrapper.appendChild(postlikes)
        var dislikesWrapper = document.createElement("div");
        dislikesWrapper.className = "likes-wrapper dislike"
        likesDislikesWrapper.appendChild(dislikesWrapper)
        var dislikesImg = document.createElement("img");
        dislikesImg.src = "./frontend/assets/dislike4.svg"
        dislikesWrapper.appendChild(dislikesImg)
        var postdislikes = document.createElement("div");
        postdislikes.className = "dislike"
        postdislikes.innerText = dislikes
        dislikesWrapper.appendChild(postdislikes)
        var comments = document.createElement("div");
        comments.className = "comments"
        commentsWrapper.appendChild(comments)
        var commentsImg = document.createElement("img");
        commentsImg.src = "./frontend/assets/comment.svg"
        comments.appendChild(commentsImg)
        var comment = document.createElement("div");
        comment.className = "comment"
        comment.innerText = (currComments === null) ? "0 Comments" : currComments.length + " Comments"
        comments.appendChild(comment)

        post.addEventListener("click", async function(e) {
            currPost = parseInt(post.getAttribute("id"))

            await getComments(currPost)

            createPost(allPosts.filter(p => {return p.id == currPost})[0])
            createComments(currComments)
            document.getElementById('post-comments').innerHTML = (currComments === null) ? "0 Comments" : currComments.length + " Comments"
        
            postsContainer.style.display = "none"
            postContainer.style.display = "flex"
            topPanel.style.display = "none"
        })
    })
}
var firstId = 512;

function createUsers(userdata, conn) {
    onlineUsers.innerHTML = ""
    offlineUsers.innerHTML = ""

    if (userdata == null) {
        return
    }

    userdata.map(({id, username}) => {
        if (id == currId) {
            return
        }

        var user = document.createElement("div");
        user.className = "user"
        user.setAttribute("id", ('id'+id))

        if (online.includes(id)) {
            onlineUsers.appendChild(user)
        } else {
            offlineUsers.appendChild(user)
        }

        var userImg = document.createElement("img");
        userImg.src = "./frontend/assets/profile4.svg"
        user.appendChild(userImg)
        var chatusername = document.createElement("p");
        chatusername.innerText = username
        user.appendChild(chatusername)
        var msgNotification = document.createElement("div");
        msgNotification.className = "msg-notification"
        msgNotification.innerText = 1
        user.appendChild(msgNotification)

        let unreadMsgs = unread.filter((u) => {
            return u[0] == id
        })

        if (unreadMsgs.length != 0 && unreadMsgs[0][1] != 0) {
            const msgNotif =  document.getElementById('id'+id).querySelector('.msg-notification');
            msgNotif.style.opacity = "1"
            msgNotif.innerText = unreadMsgs[0][1]
            
            document.getElementById('id'+id).style.fontWeight = "900"
        } 
        

        user.addEventListener("click", function(e) {
            resetScroll();
            console.log("user clicked on a profifle with the id of:", id);
            if (typeof conn === "undefined") {
                // Handle the case when the WebSocket connection is not yet established
                console.log("WebSocket connection is not ready");
                return;
            }
            
            let resp = getData('http://localhost:8000/message?receiver=' + id+'&firstId='+ firstId);// Get the message logs from the database for the receiver ID
            resp.then(value => {
                let ridStr = user.getAttribute("id");
                console.log("ridstr:", ridStr);
                const regex = /id/i;
                const rid = parseInt(ridStr.replace(regex, ''));
                console.log("Opened chat with receiver ID:", rid);
                if (value && value.length > 0) {
                    const lastIndex = value.length - 1;
                    firstId = value[lastIndex].id;
                    lastFetchedId = firstId;
                    console.log("createUser firstId", firstId);
                  }
                counter = 0;
                document.getElementById('id'+id).querySelector(".msg-notification").style.opacity = "0";
                OpenChat(rid, conn, value, currId, firstId);// Open chat window with the receiver ID and send the message logs

                console.log("first fetch Message logs:", value);
            }).catch();
        });
    })
}


var msg = document.getElementById("chat-input");
var log = document.querySelector(".chat")

function appendLog(container, msg, date) {
    var doScroll = log.scrollTop > log.scrollHeight - log.clientHeight - 1;
    log.appendChild(container);
    container.append(msg);
    msg.append(date)
   
    if (doScroll) {// Scroll to the bottom if scrolled near the bottom
        log.scrollTop = log.scrollHeight - log.clientHeight;
    }
}

document.getElementById("categories").onchange = function () {
    let val = document.getElementById("categories").value

    if (val == "all") {
        createPosts(allPosts)
        return
    }

    filteredPosts = allPosts.filter((i) => {
        console.log(i.category)
        return i.category == val
    })
    console.log(filteredPosts)
    createPosts(filteredPosts)
}

document.getElementById("like-btn").addEventListener("click", () => {
    
    let resp = postData('http://localhost:8000/like?post_id='+currPost+'&col=likes')
    resp.then(value => {
        let vals = value.msg.split("|")
        document.getElementById('post-likes').innerHTML = parseInt(vals[0])
        document.getElementById('post-dislikes').innerHTML = parseInt(vals[1])
    }).catch()
})

document.getElementById("dislike-btn").addEventListener("click", () => {
    
    let resp = postData('http://localhost:8000/like?post_id='+currPost+'&col=dislikes')
    resp.then(value => {
        let vals = value.msg.split("|")
        document.getElementById('post-likes').innerHTML = parseInt(vals[0])
        document.getElementById('post-dislikes').innerHTML = parseInt(vals[1])
    }).catch()
})

//Sign in
document.querySelector('.signin-btn').addEventListener("click", signIn);

// Add keydown event listeners to the input fields
document.querySelector('#email-username').addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        signIn();
    }
});
document.querySelector('#signin-password').addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        signIn();
    }
});

// Function to handle sign-in
async function signIn() {
    await getPosts();
    await getUsers();

    const emailUsername = document.querySelector('#email-username');
    const signinPassword = document.querySelector('#signin-password');

    const emailUsernameValue = emailUsername.value.trim();
    const signinPasswordValue = signinPassword.value.trim();

    // Check if any field is empty
    if (emailUsernameValue === "" || signinPasswordValue === "" ) {
        const errorMessageElement = document.querySelector('.error-message');
        errorMessageElement.innerText = "Please fill in all fields.";
        errorMessageElement.classList.add('show'); // Show the error message box

        // Shake the empty field(s)
        if (emailUsernameValue === "") {
            shakeField(emailUsername);
        }
        if (signinPasswordValue === "") {
            shakeField(signinPassword);
        }

        return;
    }

    let data = {
        emailUsername: emailUsernameValue,
        password: signinPasswordValue
    };

    const errorMessageElement = document.querySelector('.error-message');

    postData('http://localhost:8000/login', data)
        .then(resp => {
            let vals = resp.msg.split("|");
            currId = parseInt(vals[0]);
            currUsername = vals[1];

            document.querySelector('.profile').innerText = currUsername;

            signinContainer.style.display = "none";
            signupNav.style.display = "none";
            contentWrapper.style.display = "flex";
            logoutNav.style.display = "flex";

            emailUsername.value = "";
            signinPassword.value = "";

            startWS();

            createPosts(allPosts);
            updateUsers();

            // Clear the error message
            errorMessageElement.innerText = "";
            errorMessageElement.classList.remove('show'); // Hide the error message box
        })
        .catch(error => {
            const errorMessage = "Username or password is incorrect.";
            errorMessageElement.innerText = errorMessage;
            errorMessageElement.classList.add('show'); // Show the error message box
        });
}

// Function to shake a field
function shakeField(field) {
    field.classList.add('shake');
    setTimeout(() => {
        field.classList.remove('shake');
    }, 500);
}




document.addEventListener('DOMContentLoaded', function() {
    // Sign up/Sign in button + link
    const signupLink = document.querySelector('#signup-link');
    const signinLink = document.querySelector('#signin-link');
    const signupBtn = document.querySelector('.signup-btn');
    const successContainer = document.querySelector('.success-container');
  
    // Logic for displaying registerContainer and updating button text
    signupLink.addEventListener('click', function() {
      signinContainer.style.display = "none";
      registerContainer.style.display = "block";
      updateSignupButtonText("SIGN IN");
    });
  
    // Logic for displaying signinContainer and updating button text
    signinLink.addEventListener('click', function() {
      signinContainer.style.display = "flex";
      registerContainer.style.display = "none";
      updateSignupButtonText("SIGN UP");
    });
  
    // Logic for toggling between sign up and sign in
    signupBtn.addEventListener("click", function() {
      if (signupBtn.innerText === "SIGN UP") {
        signinContainer.style.display = "none";
        registerContainer.style.display = "block";
        updateSignupButtonText("SIGN IN");
      } else {
        signinContainer.style.display = "flex";
        registerContainer.style.display = "none";
        updateSignupButtonText("SIGN UP");
      }
    });
  
    // Function to update the button text
    function updateSignupButtonText(text) {
      signupBtn.innerText = text;
    }
  
    // Hide the success container when the "SIGN UP" button is clicked
    signupBtn.addEventListener('click', function() {
      successContainer.style.display = "none";
    });
  });

// Enregistrement
(function() {
    const registerContainer = document.querySelector('.register-container');
    const signinContainer = document.querySelector('.signin');

    document.querySelector(".register-btn").addEventListener("click", function(e) {
        e.preventDefault();

        const fname = document.querySelector("#fname").value;
        const lname = document.querySelector("#lname").value;
        const email = document.querySelector("#email").value;
        const username = document.querySelector("#register-username").value;
        const age = document.querySelector("#age").value;
        const gender = document.querySelector("#gender").value;
        const password = document.querySelector("#register-password").value;

        const errorMessageElement = document.querySelector('.error-message2');
        errorMessageElement.innerText = ""; // Effacer le message d'erreur précédent

        let isValid = true;

        // Vérification du prénom
        if (fname === "" ) {
            errorMessageElement.innerText = "Entrez un prénom";
            errorMessageElement.classList.add('show'); // Afficher la boîte de message d'erreur
            isValid = false;
        }

        // Vérification du nom de famille
        if (lname === "" ) {
            errorMessageElement.innerText += "Entrez un nom de famille.";
            errorMessageElement.classList.add('show'); // Afficher la boîte de message d'erreur
            isValid = false;
        }

        // Vérification de l'e-mail
        if (!isValidEmail(email)) {
            errorMessageElement.innerText += "Entrez une adresse e-mail valide. ";
            errorMessageElement.classList.add('show'); // Afficher la boîte de message d'erreur
            isValid = false;
        }

        // Vérification du nom d'utilisateur
        if (username === "" ||username.lenght < 3 ) {
            errorMessageElement.innerText += "Entrez un Username. ";
            errorMessageElement.classList.add('show'); // Afficher la boîte de message d'erreur
            isValid = false;
        }

        // Vérification de l'âge
        if (age === "") {
            errorMessageElement.innerText += "Entrez une date de naissance. ";
            errorMessageElement.classList.add('show'); // Afficher la boîte de message d'erreur
            isValid = false;
        }

        // Vérification du genre
        if (gender === "") {
            errorMessageElement.innerText += "Entrez un genre. ";
            errorMessageElement.classList.add('show'); // Afficher la boîte de message d'erreur
            isValid = false;
        }

        // Vérification du mot de passe
        if (password === "") {
            errorMessageElement.innerText += "Entrez un mot de passe. ";
            errorMessageElement.classList.add('show'); // Afficher la boîte de message d'erreur
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        // Vérification si le mot de passe comporte au moins 6 caractères
        if (password.length < 8) {
            errorMessageElement.innerText = "Le mot de passe doit comporter au moins 8 caractères.";
            errorMessageElement.classList.add('show'); // Afficher la boîte de message d'erreur
            return;
        }

        let data = {
            id: 0,
            username: username,
            firstname: fname,
            surname: lname,
            gender: gender,
            email: email,
            dob: age,
            password: password
        }

        // Envoi des données via POST
        postData('http://localhost:8000/register', data)
            .then(value => {
                // Vérification si la réponse a une propriété d'erreur
                if (value.error) {
                    let customErrorMessage = "L'e-mail ou le Username que vous avez saisi est déjà pris.";
                    errorMessageElement.innerText = customErrorMessage;
                    errorMessageElement.classList.add('show'); // Afficher la boîte de message d'erreur
                    return;
                }

                const msg = value.msg;

                // Masquer le conteneur d'enregistrement
                registerContainer.style.display = "none";

                // Afficher le conteneur d'enregistrement réussi
                const successContainer = document.querySelector('.success-container');
                successContainer.style.display = "block";

                // Mettre à jour le message de succès
                const successMessage = document.querySelector('.success-message');
                successMessage.innerText = msg;

                // Bouton pour révéler le conteneur de connexion
                const signInButton = document.querySelector('.sign-in-button');
                signInButton.addEventListener('click', function() {
                    successContainer.style.display = "none";
                    signinContainer.style.display = "flex";
                });
            })
            // Attraper les erreurs et afficher le message d'erreur
            .catch(error => {
                errorMessageElement.innerText = "L'e-mail ou le nom d'utilisateur que vous avez saisi est déjà pris ou le format de l'âge est invalide.";
                errorMessageElement.classList.add('show'); // Afficher la boîte de message d'erreur
            });
    });

    // Fonction pour vérifier si l'e-mail est valide
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Fonction pour envoyer une requête POST
    function postData(url, data) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }
})();





//New post button
document.querySelector(".new-post-btn").addEventListener("click", function() {
    postsContainer.style.display = "none"
    postContainer.style.display = "none"
    createPostContainer.style.display = "flex"
    topPanel.style.display = "none"
    const title = document.querySelector("#create-post-title").value = ""
    const body = document.querySelector("#create-post-body").value = ""

})

//Create new post
document.querySelector(".create-post-btn").addEventListener("click", function() {
    
    const title = document.querySelector("#create-post-title").value.trim();
    const body = document.querySelector("#create-post-body").value.trim();
    const category = document.querySelector("#create-post-categories").value
    let valid = true; 
  
    
    if (title == "" || body == "") {
        alert("please fill title or/and body");
        valid = false;
    } 
    if (!valid) {
        return;
    }
    let data = {
        id: 0,
        user_id: 0,
        category: category,
        title: title,
        content: body,
        date: '',
        likes: 0,
        dislikes: 0
    }
    
    var msg
    let resp = postData('http://localhost:8000/post', data)
    resp.then(async value => {
        msg = value.msg

        await getPosts()
        createPosts(allPosts)

        sendMsg(conn, 0, {value: "New Post"}, 'post')

        createPostContainer.style.display = "none"
        postsContainer.style.display = "flex"
        topPanel.style.display = "flex"
        
    })
})

//Comments
document.querySelector(".send-comment-btn").addEventListener("click", sendComment)
document.querySelector("#comment-input").addEventListener("keydown", function(event) {
    if (event.keyCode === 13) {
        sendComment();
    }
})

function sendComment() {
    
    let comment = document.querySelector("#comment-input").value
    commentsdata = {
        id: 0,
        post_id: currPost,
        user_id: currId,
        content: comment,
        date: ""
    }
    console.log(commentsdata)
    
    let resp = postData('http://localhost:8000/comment', commentsdata)
    resp.then(async () => {
        document.querySelector("#comment-input").value = ""

        await getComments(currPost)
        document.getElementById('post-comments').innerHTML = (currComments === null) ? "0 Comments" : currComments.length + " Comments"
        createComments(currComments)
    })
}


//Go back to home page when click on logo + back button
document.querySelector(".logo").addEventListener("click", home)
document.querySelector(".back").addEventListener("click", home)
document.querySelector("#back-btn").addEventListener("click", home)

async function home() {
    selectCategories = document.getElementById("categories");
    selectCategories.selectedIndex = 0;

    await getPosts()
    createPosts(allPosts)

    createPostContainer.style.display = "none"
    postContainer.style.display = "none"
    postsContainer.style.display = "flex"
    topPanel.style.display = "flex"
    newPostNotif.style.display = "none"
}

newPostNotif.addEventListener('click', async function() {
    
    await getPosts()
    createPosts(allPosts)
    newPostNotif.style.display = "none"
    window.scrollTo(0, 0);
});

function closeWS() {
    if (conn.readyState === WebSocket.OPEN) {
        conn.close()
    }
}

//Log out btn
document.querySelector(".logout-btn").addEventListener("click", function() {
    var msg
    var chatWrapper = document.querySelector(".chat-wrapper");
    if (chatWrapper) {
    chatWrapper.style.display = "none";
    } 
    let resp = postData('http://localhost:8000/logout')
    resp.then(value => {
        msg = value.msg
        console.log(msg)

        signinContainer.style.display = "flex"
        registerContainer.style.display = "none"
        contentWrapper.style.display = "none"  
        signupNav.style.display = "flex"
        logoutNav.style.display = "none"
        resetScroll();

        closeWS()
    })
})

