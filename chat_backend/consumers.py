import json, uuid
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import User, ChatHistory, Room, ChatRequest
from django.db.models import Q
import datetime

class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self): 
        self.room_id = self.scope["url_route"]["kwargs"]["id"]
        self.room_group_id = "chat_%s" % self.room_id

        if not self.scope["user"].is_authenticated:
            self.send("User is not authenticated")
            return
    
        @database_sync_to_async
        def get_room():
            try: 
                room = Room.objects.filter(room_id=str(self.room_id))
                current_user_in_room = room.filter(members=str(self.scope["user"].id))
            except Room.DoesNotExist:
                self.send("Room doesn't exist")
                return

            try:
                chat_history = ChatHistory.objects.filter(Q(sender__id=str(self.scope["user"].id)) | Q(receivers=str(self.scope["user"].id)))
            except ChatHistory.DoesNotExist:
                self.send("Chat doesn't exist")
                return

            if current_user_in_room.exists() or str(self.scope["user"].id) == str(self.room_id):  
                return True
        
            return False
    
        if await get_room(): 
            await self.accept()

        await self.channel_layer.group_add(
            self.room_group_id, self.channel_name
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_id, self.channel_name
        )

    
    async def receive(self, text_data): 
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        send_to = text_data_json["sendTo"]
        new_msg_id = uuid.uuid4()  
        user = self.scope["user"]
        date_time = datetime.datetime.now()
        receivers = []
        receivers.append(send_to)
        
        await self.channel_layer.group_send( 
            self.room_group_id, {"type": "chat_message", 
                                    "message": message,
                                    "id": str(new_msg_id),
                                    "sender_id": str(user.id),
                                    "sender_name": user.name,
                                    "sender_last_name": user.last_name, 
                                    "room_id": str(self.room_id),
                                    "receivers": receivers,
                                    "date_time": str(date_time),
                                    "deleted_msg_id": "" 
                                    }) 

        @database_sync_to_async
        def save_message(message):
            try:
                new_message_sender = User.objects.get(id=str(user.id))
                receiver = User.objects.get(id=str(send_to))
            except User.DoesNotExist:
                self.send("User not found") 
                return
            
            try: 
                room = Room.objects.get(room_id=str(self.room_id))
                room.last_msg_date_time = str(date_time)
                room.save()
            except Room.DoesNotExist:
                self.send("Room not found")
                return
            
            chat_message = ChatHistory.objects.create( 
            id=str(new_msg_id), date_time=str(date_time), sender=new_message_sender, content=message, seen=False, room_id=str(self.room_id)) 
            chat_message.receivers.add(receiver)

            return chat_message

        await save_message(message)

    async def chat_message(self, event):  
        sender_data = {
            "id": event["sender_id"],
            "name":event["sender_name"],
            "last_name": event["sender_last_name"],
            "date_time": event["date_time"]
        }
        
        await self.send(text_data=json.dumps({"message": event["message"], "id": event["id"], 
                                            "sender": sender_data, "room_id": event["room_id"], "date_time": event["date_time"],
                                            "receivers": event["receivers"], "deleted_msg_id": event["deleted_msg_id"]
                                        }))


class GetNotifiedConsumer(AsyncJsonWebsocketConsumer): 
    async def connect(self):
        self.notification_group_name = "chat_notif"
        await self.accept()

        await self.channel_layer.group_add(
            self.notification_group_name, self.channel_name 
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.notification_group_name, self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        type = text_data_json["type"]
        user = self.scope["user"]

        if not user.is_authenticated:
            self.send("Non authenticatd user")

        
        if type == "get_unseen_messages":  
            room_id = text_data_json["roomId"]
            @database_sync_to_async
            def get_num_of_messages(): 
                try:
                    rooms = Room.objects.filter(room_id=str(room_id))
                except Room.DoesNotExist:
                    self.send("error")
                    return
                
                for room in rooms:
                    unseen_messages = ChatHistory.objects.filter(room_id=room.room_id, seen=False).count() 
                    
                    room_data = {
                        "id": str(room.id),
                        "room_id": str(room_id),  
                        "number_of_unseen_msgs": unseen_messages + 1, 
                        "sender_id": str(user.id)
                    }

                return room_data
            
            room_data = await get_num_of_messages()
            await self.channel_layer.group_send(
                self.notification_group_name, {"type": "chat_message", "room_data": room_data,
                                                "notification": "", "remove_request_data": "",
                                                "accept_request_data": "", "is_request_sent": "",
                                                "is_seen_data": "", "deleted_msg_id": "", "hide_msg_data": "",
                                                "is_all_deleted_data": "", "rmv_room_data": ""
                                                }) 

        elif type == "update_to_seen": 
            room_id_update = text_data_json["roomIdToUpdate"] 
            @database_sync_to_async 
            def update_unseen_to_seen():
                try:
                    chat_history = ChatHistory.objects.filter(receivers=str(user.id), room_id=str(room_id_update), seen=False,)
                except ChatHistory.DoesNotExist:   
                    self.send("Chat not found")
                    return 
        
                for ch in chat_history:
                        ch.seen = True
                        ch.save() 

                return {"user_id": str(user.id),  
                        "is_seen": True,
                        "room_id": room_id_update 
                }    
                        
            is_seen_data = await update_unseen_to_seen()  
            await self.channel_layer.group_send(
                            self.notification_group_name, {"type": "chat_message", "room_data": "",
                                                                "notification": "", "remove_request_data": "",
                                                                "accept_request_data": "", "is_request_sent": "",
                                                                "is_seen_data": is_seen_data, "deleted_msg_id": "",
                                                                "hide_msg_data": "", "is_all_deleted_data": "", "rmv_room_data": ""
                                                            }) 
        elif type == "send_request":
            sender_name = text_data_json["senderName"]
            sender_last_name = text_data_json["senderLastName"]
            sent_by = text_data_json["sentBy"]
            sent_to = text_data_json["sentTo"]

            @database_sync_to_async
            def send_chat_request():
                if str(sent_by) != str(user.id): 
                    return
                try:
                    room = Room.objects.filter(members=str(sent_to))
                    r = room.filter(members=str(sent_by))
                except Room.DoesNotExist:
                    self.send("Room doesn't exist")
                    return

                if r.exists():
                    return 

                if sent_to == sent_by:
                    self.send("Can't send request to yourself")
                    return
            
                try:
                    sent_by_user = User.objects.get(id=str(sent_by))
                    sent_to_user = User.objects.get(id=str(sent_to))
            
                except User.DoesNotExist:
                    sent_by_user = None
                    sent_to_user = None
            
                if sent_by_user and sent_to_user and sent_by_user.id == user.id:
                    try:
                        existing_request = ChatRequest.objects.get(sent_by=sent_by_user.id, sent_to=sent_to_user.id)
                        self.send("Request is already sent")
                        return
                    except ChatRequest.DoesNotExist:
                        existing_request = None
                date_time = datetime.datetime.now()
                if existing_request is None:
                    chat_request = ChatRequest(sender_name=sender_name, sender_last_name=sender_last_name,
                                                sent_by=sent_by_user.id, sent_to=sent_to_user.id, date_time=str(date_time))
                    chat_request.save()

                try: 
                    new_notification = ChatRequest.objects.get(sent_to=str(sent_to), sent_by=str(sent_by),
                                                                sender_name=sender_name, sender_last_name=sender_last_name)
                except ChatRequest.DoesNotExist:
                    self.send("Chat doesn't exist")
                    return

                my_notif = {
                            "id": str(new_notification.id),
                            "sender_name": new_notification.sender_name,
                            "sender_last_name": new_notification.sender_last_name,
                            "sent_by": str(new_notification.sent_by), 
                            "sent_to": str(new_notification.sent_to)
                        }

                return my_notif

            my_notif = await send_chat_request()  
            await self.channel_layer.group_send(
                self.notification_group_name, {"type": "chat_message", "room_data": "",
                                                    "notification": my_notif, "remove_request_data": "",
                                                    "accept_request_data": "", "is_request_sent": "is_sent",
                                                    "is_seen_data": "", "deleted_msg_id": "", "hide_msg_data": "",
                                                    "is_all_deleted_data": "", "rmv_room_data": ""
                                                })
            
        elif type == "remove_request": 
            sender = text_data_json["sender"] 
            sent_to = text_data_json["sentTo"]  
            @database_sync_to_async
            def remove_chat_request():  
                if str(sender) == str(user.id):
                    try:
                        requested_to_chat = ChatRequest.objects.get(
                            sent_by=sender, sent_to=sent_to)
                    except ChatRequest.DoesNotExist:
                        requested_to_chat = None  

                    if requested_to_chat:
                        requested_to_chat.delete()
                        self.send("sucessfully removed the request")
                else:
                    self.send("Current user id mismatches to sender id")
                    return
                
            remove_data = {
                "sender": str(sender),
                "sent_to": str(sent_to) 
            }

            await self.channel_layer.group_send(
                self.notification_group_name, {"type": "chat_message", "room_data": "",
                                                    "notification": "", "remove_request_data": remove_data,
                                                    "accept_request_data": "", "is_request_sent": "is_removed",
                                                    "is_seen_data": "", "deleted_msg_id": "", "hide_msg_data": "", 
                                                    "is_all_deleted_data": "", "rmv_room_data": ""
                                                })
            await remove_chat_request()
        
        elif type == "delete_message":
            msg_id = text_data_json["messageId"]
            @database_sync_to_async
            def delete_msg():
                try:
                    ms_to_delete = ChatHistory.objects.get(id=str(msg_id)) 
                    ms_to_delete.delete()    
                except ChatHistory.DoesNotExist:
                    self.send("Chat doesn't exist or there are multple chats with the same id")
                    return   
                
                return msg_id   
            
            deleted_msg_id = await delete_msg()
            await self.channel_layer.group_send(
                self.notification_group_name, {"type": "chat_message", "room_data": "",
                                            "notification": "", "remove_request_data": "",
                                            "accept_request_data": "", "is_request_sent": "",
                                            "is_seen_data": "", "deleted_msg_id": deleted_msg_id, "hide_msg_data": "",
                                            "is_all_deleted_data": "", "rmv_room_data": ""
                                        })

        elif type == "delete_all_msgs":
            user_id_to_dlt_for = text_data_json["userId"]
            room_id_to_dlt = text_data_json["roomId"]
            @database_sync_to_async
            def delete_all_msg():
                if str(user_id_to_dlt_for) != str(user.id):
                    self.send("Current user id mismatches to sender id")
                    return

                try:
                    ms_to_delete = ChatHistory.objects.filter(room_id=str(
                        room_id_to_dlt), sender__id=str(user_id_to_dlt_for))
                    ms_to_delete.delete() 
                except ChatHistory.DoesNotExist:
                    self.send("Chat doesn't exist")
                    return

                try:
                    ms_to_delete = ChatHistory.objects.filter(room_id=str(
                        room_id_to_dlt), receivers=str(user_id_to_dlt_for))
                    for msg in ms_to_delete:
                        msg.hidden_for.add(str(user_id_to_dlt_for))
                except ChatHistory.DoesNotExist:
                    self.send("Chat doesn't exist")
                    return

                return {
                    "user_id_dlt_for": user_id_to_dlt_for,
                } 
            
            delete_all_msg_data = await delete_all_msg()
            await self.channel_layer.group_send(
                self.notification_group_name, {"type": "chat_message", "room_data": "",
                                        "notification": "", "remove_request_data": "",
                                        "accept_request_data": "", "is_request_sent": "",
                                        "is_seen_data": "", "deleted_msg_id": "", "hide_msg_data": "",
                                        "is_all_deleted_data": delete_all_msg_data, "rmv_room_data": ""
                                        })
            
        elif type == "hide_message":
            msg_id = text_data_json["messageId"]
            user_to_hide_for_id = text_data_json["userId"]
            @database_sync_to_async
            def hide_msg():
                if user_to_hide_for_id != str(user.id):
                    self.send("Current user id mismatches to sender id")
                    return

                try:
                    ms_to_hide = ChatHistory.objects.get(id=str(msg_id))
                    ms_to_hide.hidden_for.add(str(user_to_hide_for_id))
                except ChatHistory.DoesNotExist:
                    self.send(
                        "Chat doesn't exist or there are multple chats with the same id")
                    return
                
                return {
                    "msg_id": msg_id,
                    "user_id": user_to_hide_for_id 
                } 
            
            hide_msg_data = await hide_msg()
            await self.channel_layer.group_send(
                self.notification_group_name, {"type": "chat_message", "room_data": "",
                                            "notification": "", "remove_request_data": "",
                                            "accept_request_data": "", "is_request_sent": "",
                                            "is_seen_data": "", "deleted_msg_id": "", "hide_msg_data": hide_msg_data,
                                            "is_all_deleted_data": "", "rmv_room_data": ""
                                        })
    
        elif type == "accept_request":
            sender_id = text_data_json["senderId"]
            my_id = text_data_json["myId"]
            @database_sync_to_async
            def accept_chat_request(): 
            
                if not sender_id or not my_id:
                    return
                
                existing_sent_request = ChatRequest.objects.filter(sent_by=str(my_id), sent_to=str(sender_id))

                # when current user accepts chat request, if he/she had sent request too, the request will be removed
                if  existing_sent_request.exists():
                    existing_sent_request.delete()
                
                existing_rooms = Room.objects.filter(members=str(sender_id))
                existing_room = existing_rooms.filter(members=str(my_id))

                if existing_room.exists():
                    existing_room.delete()

                try: 
                    notification = ChatRequest.objects.filter(
                        sent_to=my_id, sent_by=sender_id)
                except ChatRequest.DoesNotExist:
                    self.send("Chat doesn't exist")
                    return

                if str(user.id) != str(my_id):
                    self.send("Current user id mismatches to sender id")
                    return

                if not notification.exists():
                    self.send("Notification doesn't exist")
                    return

                try:
                    sender_user = User.objects.get(id=str(sender_id))
                    receiver_user = User.objects.get(id=str(my_id))
                except User.DoesNotExist:
                    sender_user = None
                    receiver_user = None


                if sender_user and receiver_user:
                    room = Room.objects.create(id=uuid.uuid4(), room_id=uuid.uuid4())
                    room.members.add(sender_user.id, receiver_user.id)
                    notification.delete()
                
                try:
                    my_rooms = Room.objects.filter(members=str(my_id))
                    rooms = my_rooms.filter(members=str(sender_id))
                except Room.DoesNotExist:
                    self.send("Room doesn't exist")
                    return

                try:
                    if str(user.id) == str(sender_id):
                        users = User.objects.get(id=str(sender_id))
                    elif str(user.id) == str(my_id):
                        users = User.objects.get(id=str(my_id))
                except User.DoesNotExist:
                    self.send("User doesn't exist")
                    return

                for r in rooms:
                    room_id = r.room_id 

                user_data_response = {
                    "my_id": str(my_id),
                    "sender_id": str(sender_id),
                    "id": str(users.id),
                    "name": users.name, 
                    "last_name": users.last_name,
                    "birth_date": str(users.birth_date),
                    "email": users.email,
                    "room_id": str(room_id) 
                }

                return user_data_response 
        
            data = await accept_chat_request()    
            await self.channel_layer.group_send( 
                            self.notification_group_name, {"type": "chat_message", "room_data": "",
                                                            "notification": "", "remove_request_data": "",
                                                            "accept_request_data": data, "is_request_sent": "is_accepted",
                                                            "is_seen_data": "", "deleted_msg_id": "", "hide_msg_data": "",
                                                            "is_all_deleted_data": "", "rmv_room_data": ""
                                                            })
        elif type == "refuse_request":
            sender_id = text_data_json["senderId"]
            my_id = text_data_json["myId"]
            @database_sync_to_async
            def refuse_request():
                if str(user.id) != str(my_id):
                    self.send("Current user id mismatches to sender id")
                    return
                try:
                    notification = ChatRequest.objects.filter(sent_to=my_id, sent_by=sender_id)
                except ChatRequest.DoesNotExist:
                    self.send("Chat doesn't exist")
                    return

                if notification.exists():
                    notification.delete() 

            remove_data = {
                "sender": str(sender_id), 
                "sent_to": str(my_id) 
            }

            await self.channel_layer.group_send( 
                self.notification_group_name, {"type": "chat_message", "room_data": "",
                                                "notification": "", "remove_request_data": remove_data,
                                                "accept_request_data": "", "is_request_sent": "is_removed",
                                                "is_seen_data": "", "deleted_msg_id": "", "hide_msg_data": "",
                                                "is_all_deleted_data": "", "rmv_room_data": ""
                                                })
            await refuse_request() 

        elif type == "remove_from_chat":
            sender_id = text_data_json["senderId"]
            member_id = text_data_json["memberId"]
            @database_sync_to_async
            def remove_from_chat():
                if str(sender_id) != str(user.id):
                    return
                try:
                    my_rooms = Room.objects.filter(members=str(sender_id))
                    room_to_delete = my_rooms.get(members=str(member_id))
                    chats = ChatHistory.objects.filter(room_id=str(room_to_delete.room_id))
                    rm_id = room_to_delete.room_id

                    room_to_delete.delete()

                    for chat in chats:
                        chat.delete() 

                except Room.DoesNotExist: 
                    return
                
                return {
                    "room_id": rm_id,
                    "sender_id": sender_id,
                    "member_id": member_id
                }
            
            rmv_room_data = await remove_from_chat()
            await self.channel_layer.group_send(
                self.notification_group_name, {"type": "chat_message", "room_data": "",
                                                "notification": "", "remove_request_data": "",
                                                "accept_request_data": "", "is_request_sent": "is_removed",
                                                "is_seen_data": "", "deleted_msg_id": "", "hide_msg_data": "",
                                                "is_all_deleted_data": "", "rmv_room_data": rmv_room_data
                                                })
            
    async def chat_message(self, event): 
        await self.send(text_data=json.dumps({"roomData": event["room_data"],
                                            "notification": event["notification"],
                                            "remove_request_data": event["remove_request_data"], 
                                            "accept_request_data": event["accept_request_data"],
                                            "is_request_sent": event["is_request_sent"],
                                            "is_seen_data": event["is_seen_data"], "deleted_msg_id": event["deleted_msg_id"], 
                                            "hide_msg_data": event["hide_msg_data"], "is_all_deleted_data": event["is_all_deleted_data"],
                                            "rmv_room_data": event["rmv_room_data"]
                                            }))
