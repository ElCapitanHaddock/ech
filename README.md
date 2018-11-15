# Ech
#### by Jeremy Yang
###### Ech is an IRC chatroom app I designed in sophomore year to coordinate my group projects. I ended up using it for quite a few more projects than I expected, all the way up into junior year.
.
![Sscreenshot](https://i.imgur.com/m8mOx7q.png)
### Current features:
- Authentication, user login and account creation. Uses noSQL
- Guest acounts with randomized salts for recognition
- Sending and recieving messages in different namespaced rooms, with rich text
- Joining/creating/changing rooms
- Setting passwords for rooms that you own
- Transferring ownership of rooms
- Whispering private messages to users by their ID
- Cookie sessions for authentication storage

### Dependencies:
- socket.io
- expressJS
- noSQL