document.addEventListener('DOMContentLoaded', () => {

    selectedChannel = document.getElementById("channels-table").rows[1].cells[0].innerHTML;

    // Disable buttons by default
    document.getElementById('button-add-channel').disabled = true;
    document.getElementById('button-send-message').disabled = true;

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // When connected, configure buttons
    socket.on('connect', () => {

        // Format the selected channel
        document.getElementById("channels-table").rows[1].cells[0].style.fontWeight = 'bold';
        document.getElementById("channels-table").rows[1].cells[0].style.color = '#007bff'

        document.querySelectorAll('td').forEach(dataRow => {
            dataRow.onclick = () => {
                // Set all the other elements of the table to not bold
                document.querySelectorAll('td').forEach(dataRow => {
                    dataRow.style.fontWeight = 'normal';
                    dataRow.style.color = 'black';
                });
                dataRow.style.fontWeight = 'bold';
                dataRow.style.color='#007bff';
                selectedChannel = dataRow.innerHTML
            }
        });

        document.getElementById('button-add-channel').onclick = () => {
            const channelName = document.getElementById('add-channel-name').value;
            socket.emit('add channel', {'channel': channelName})
        };

        document.getElementById('button-send-message').onclick = () => {
            const message = document.getElementById('input-add-message').value;
            socket.emit('send message', {'channel': selectedChannel, 'message': message})
        }

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
        var tableRow = document.createElement("tr");
        var tableData = document.createElement("td");

        tableData.innerHTML = data;

        tableRow.appendChild(tableData);

        var table = document.getElementById("channels-table");
        table.appendChild(tableRow);

        // Clear out the Channel Name field
        document.getElementById('add-channel-name').value = ""
    });

    // When the channel name already exists, use an Alert to throw the error
    socket.on('channel exists', data => {
        alert(data.error);
    });
});
