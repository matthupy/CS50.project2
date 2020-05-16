document.addEventListener('DOMContentLoaded', () => {

    localStorage.setItem('username', document.getElementById('username').innerHTML)

    if (!localStorage.getItem('lastChannel'))
        localStorage.setItem('lastChannel', document.getElementById("channels-table").rows[1].cells[0].innerHTML);
    
    selectedChannel = localStorage.getItem('lastChannel');


    // Disable buttons by default
    document.getElementById('button-add-channel').disabled = true;
    document.getElementById('button-send-message').disabled = true;

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    function getMessages(channelName) {
        // Remove all of the child objects in the message-area
        document.getElementById('message-area').innerHTML = ''

        // Get the new messages for the selected channel
        const request = new XMLHttpRequest();
        request.open('POST', '/messages');
        request.onload = () => {
            const data = JSON.parse(request.responseText);
            data.forEach(function (messagesObject) {
                // Create a new message
                const post = document.createElement('div');
                post.className = 'message';
                if (localStorage.getItem('username').trim() == messagesObject['username'].trim()){
                    post.className += ' my-message';
                };
                const header = document.createElement('p');
                header.className = 'post-username'
                header.innerHTML = messagesObject['username'] + " - " + messagesObject['timestamp']
                post.appendChild(header);
                const body = document.createElement('p');
                body.innerHTML = messagesObject['message']
                post.appendChild(body);

                // Add the message to the DOM
                document.getElementById('message-area').append(post)
            });
            
        }

        // Send the channel name when getting messages
        const data = new FormData();
        data.append('channel', channelName);

        // Send request
        request.send(data)
    }

    function refreshChannels() {
        document.querySelectorAll('td').forEach(dataRow => {
            dataRow.onclick = () => {
                // Set all the other elements of the table to not bold
                document.querySelectorAll('.table-data').forEach(dataRow => {
                    dataRow.style.fontWeight = 'normal';
                    dataRow.style.color = 'black';
                });
                dataRow.style.fontWeight = 'bold';
                dataRow.style.color='#007bff';
                selectedChannel = dataRow.innerHTML;
                localStorage.setItem('lastChannel', selectedChannel);

                // Remove all of the child objects in the message-area
                document.getElementById('message-area').innerHTML = ''

                // Get the new messages for the selected channel
                getMessages(selectedChannel)
            }
        });
    }

    // When connected, configure buttons
    socket.on('connect', () => {

        var lastChannel = localStorage.getItem('lastChannel');

        var defaultChannel = document.getElementById(lastChannel);
        // Format the selected channel
        defaultChannel.style.fontWeight = 'bold';
        defaultChannel.style.color = '#007bff'

        // Get the new messages for the first channel
        getMessages(lastChannel)

        refreshChannels();

        document.getElementById('button-add-channel').onclick = () => {
            const channelName = document.getElementById('add-channel-name').value;
            socket.emit('add channel', {'channel': channelName})
        };

        document.getElementById('button-send-message').onclick = () => {
            const message = document.getElementById('input-add-message').value;
            socket.emit('send message', {'channel': selectedChannel, 'message': message})
            document.getElementById('input-add-message').value = '';
            document.getElementById('button-send-message').disabled = true;
        };

    });


    // enable button only if there is text in the input field
    document.getElementById('add-channel-name').onkeyup = () => {
        if (document.getElementById('add-channel-name').value.length > 0)
            document.getElementById('button-add-channel').disabled = false;
        else
            document.getElementById('button-add-channel').disabled = true;
    };
    document.getElementById('input-add-message').onkeyup = () => {
        if (document.getElementById('input-add-message').value.length > 0)
            document.getElementById('button-send-message').disabled = false;
        else
            document.getElementById('button-send-message').disabled = true;
    };

    // When a new channel is created, add to the channel list
    socket.on('channels refresh', data => {
        var table = document.querySelector("tbody");
        var tableRow = document.createElement("tr");
        var tableData = document.createElement("td");
        tableData.classList.add("table-data");
        tableRow.id = data;

        tableData.innerHTML = data;

        tableRow.append(tableData);
        table.append(tableRow);

        // Clear out the Channel Name field
        document.getElementById('add-channel-name').value = ""

        // refresh the channels 
        refreshChannels();
    });

    // When a new message is added, refresh the messages
    socket.on('messages refresh', data => {
        channelName = data['channel']
        // Only refresh messages if the channel matches the current one
        if (channelName = selectedChannel)
        {
            getMessages(channelName)
        }
    });

    // When the channel name already exists, use an Alert to throw the error
    socket.on('channel exists', data => {
        alert(data.error);
    });
});
