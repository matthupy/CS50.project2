document.addEventListener('DOMContentLoaded', () => {

    // disable the login button by default
    document.getElementById('login').disabled = true;

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    

    // When connected, configure buttons
    socket.on('connect', () => {

        // Clear the handle input field after submit is clicked
        document.querySelectorAll('button').forEach(button => {
            button.onclick = () => {
                document.getElementById('handle-input').value = '';
            };
        });
        

    });

    document.getElementById('username').onkeyup = () => {
        if (document.getElementById('username').value.length > 0 && document.getElementById('password').value.length > 0)
            document.getElementById('login').disabled = false;
        else
            document.getElementById('login').disabled = true;
    };

    document.getElementById('password').onkeyup = () => {
        if (document.getElementById('username').value.length > 0 && document.getElementById('password').value.length > 0)
            document.getElementById('login').disabled = false;
        else
            document.getElementById('login').disabled = true;
    };


});
