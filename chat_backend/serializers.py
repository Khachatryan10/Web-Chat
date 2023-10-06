from rest_framework import serializers
from .models import User, ChatHistory, ChatRequest, Room 

class UserDataAPI(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "name", "last_name", "birth_date", "email")

class UserDataAndRoomAPI(serializers.ModelSerializer):
    room_id = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ("id", "name", "last_name", "birth_date", "email", 'room_id')

    def get_room_name(self, data):
        return ""

class UsersAPI(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "name", "last_name")

class RoomMembersIdsAPI(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = "__all__" 

class ChatHistoryAPI(serializers.ModelSerializer):
    sender = UsersAPI()
    class Meta:
        model = ChatHistory
        fields = "__all__"

class SendChatRequestAPI(serializers.ModelSerializer):
    class Meta:
        model = ChatRequest
        fields = ("id", "sender_name", "sender_last_name", "sent_by", "sent_to")