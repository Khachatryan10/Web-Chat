from django.middleware import csrf
from django.shortcuts import render, HttpResponse
from .models import User, ChatHistory, ChatRequest, Room
import json, re, uuid
from django.http import JsonResponse
from django.db import IntegrityError
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .serializers import UserDataAPI, ChatHistoryAPI, UsersAPI, SendChatRequestAPI, RoomMembersIdsAPI, UserDataAndRoomAPI
from rest_framework.pagination import PageNumberPagination

def index(request):
    return render(request, "index.html")

def get_csrf_token(request):
    csrf_token = csrf.get_token(request)
    return JsonResponse({"csrf_token": csrf_token})

@api_view(["POST"])
def register_user(request):
    if request.method == "POST":
        user_data = request.data
        name = user_data.get("name")
        last_name = user_data.get("lastName")
        birth_date = user_data.get("birthDate")
        email = user_data.get("email")
        password = user_data.get("password")
        confirmation = user_data.get("confirmation")
        name_regex = re.search(r"^[a-zA-Z]+$", name)
        last_name_regex = re.search(r"^[a-zA-Z]+$", last_name)
        containsNumber = re.search(r"\d", password)
        containsCapitalLetter = re.search(r"[A-Z]", password)
        containsSmallLetter = re.search(r"[a-z]", password)
        containsSpecificCharacter = re.search(
            r"[/,?(){}_[\]#\-*+<>|;:!'\".\\$~@`]", password)
        matches_all = containsNumber and containsCapitalLetter and containsSmallLetter and containsSpecificCharacter
        emailRegex = re.search(
            r"^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$", email)
        bd_list = birth_date.split("-")
        
        day = bd_list[2][1] if bd_list[2][0] == 0 else bd_list[2]
        month = bd_list[1][1] if bd_list[1][0] == 0 else bd_list[1]
        valid_year = int(bd_list[0]) < 2009 and int(bd_list[0]) > 1900 

        valid_day = int(day) > 0 and int(day) <= 31 
        valid_month = int(month) > 0 and int(month) <= 12
        valid_date = valid_year and valid_day and valid_month and len(birth_date) == 10
        
        if not valid_date:
            return Response("Invalid birth date", status=status.HTTP_404_NOT_FOUND)

        if not name or not last_name or not birth_date or not email or not password or not confirmation:
            return Response("Please fill all input fields", status=status.HTTP_400_BAD_REQUEST)
        
        if not matches_all or not emailRegex or not name_regex or not last_name_regex: 
            return Response("Regex failed", status=status.HTTP_400_BAD_REQUEST)
        
        if password != confirmation:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.create_user(email=email,birth_date=birth_date, 
                                                    name=name, last_name=last_name, full_name=f"{name} {last_name}", password=password)
            user.save() 
            room = Room.objects.create(id=uuid.uuid4(), room_id=str(user.id))
            room.members.add(user)
            return Response("Sucessfully registered user", status=status.HTTP_200_OK)
        
        except IntegrityError:
            return Response("Email already taken", status=status.HTTP_409_CONFLICT)
        

    else:
        return Response("This url is only for POST requests")


def login_request(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")
        password = data.get("password")
        authenticate_user = authenticate(request, email=email, password=password)
        
        if authenticate_user is not None:
            login(request, authenticate_user)
            return HttpResponse(status=200)
        else:
            return HttpResponse(status=403)
    else:
        HttpResponse("This url is only for POST requests")

@api_view(["GET"])
def current_user_info(request):
    is_authenticated = request.user.is_authenticated

    if is_authenticated:
        try: 
            user_data = User.objects.filter(id=request.user.id)
        except User.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        
        serialized_data = UserDataAPI(user_data, many=True)
        return Response(serialized_data.data)
    return Response([])

def logout_user(request):
    logout(request)
    return render(request, "index.html")


def room(request, id):
    return render(request, "index.html")

def user(request, user_id):
    return render(request, "index.html")


@api_view(["GET"])
def users(request, search_input, page_size):
    pagination = PageNumberPagination()

    try: 
        serached_users = User.objects.filter(Q(name__contains=search_input) | Q(
            last_name__contains=search_input) | Q(full_name__contains=search_input)).order_by("name")
    except User.DoesNotExist:
        return
    
    all_users_num = serached_users.count()
    pagination.page_size = page_size if page_size <= all_users_num else all_users_num

    if not request.user.is_authenticated:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    try:
        users = pagination.paginate_queryset(serached_users, request)
    except User.DoesNotExist:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    serialized_users_data = UsersAPI(users, many=True)
    return Response(serialized_users_data.data)

@api_view(["GET"])
def notifications_sent_by_me(request, my_id, chat_user_id):
    if str(my_id) != str(request.user.id):
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    try:
        requests_sent_by_me = ChatRequest.objects.get(sent_by=my_id, sent_to=chat_user_id)
    except ChatRequest.DoesNotExist:
        requests_sent_by_me = None
    request_data = SendChatRequestAPI(requests_sent_by_me, many=False)
    return Response(request_data.data) 
    

@api_view(["GET"])
def my_notifications(request, page_size):
    try:
        notifs = ChatRequest.objects.filter(sent_to=request.user.id)
    except ChatRequest.DoesNotExist:
        return
    
    notifs_count = notifs.count()
    pagination = PageNumberPagination()
    pagination.page_size = page_size if page_size < notifs_count else notifs_count

    if not request.user.is_authenticated:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    try:
        my_notifications = pagination.paginate_queryset(ChatRequest.objects.filter(sent_to=request.user.id).order_by("date_time"), request)
    except ChatRequest.DoesNotExist:
        my_notifications = []
    my_serialized_notif = SendChatRequestAPI(my_notifications, many=True)
    return Response(my_serialized_notif.data)


@api_view(["GET"])
def get_chat_user(request, id):
    if not request.user.is_authenticated:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        chat_user = User.objects.get(id=id)
    except User.DoesNotExist:
        chat_user = []
    request_data = UsersAPI(chat_user, many=False)
    return Response(request_data.data)

@api_view(["DELETE"])
def refuse_request(request):
    if request.method == "DELETE":
        data = request.data
        sender_id = data.get("senderId")
        my_id = data.get("myId")

        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        
        if str(request.user.id) != str(my_id):
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        try:
            notification = ChatRequest.objects.filter(sent_to=my_id, sent_by=sender_id)
        except ChatRequest.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if notification.exists():
            notification.delete()
            return Response(status=status.HTTP_200_OK)
        else: 
            return Response(status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response("Url is only intended for DELETE request")

@api_view(["GET"])
def get_chat_rooms(request):
    if not request.user.is_authenticated:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        rooms = Room.objects.filter(members=request.user.id)
    except Room.DoesNotExist:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    room_data = []

    if not rooms.exists():
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    for room in rooms:
        try:
            messages = ChatHistory.objects.filter(room_id=room.room_id)
        except ChatHistory.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        
        room_data.append({
            "id": room.id,
            "num_of_messages": len(messages),
            "room_id": room.room_id,
            "members": [str(member.id) for member in room.members.all()]
        })

    return Response(room_data) 

@api_view(["GET"])
def get_chat_members(request):
    if not request.user.is_authenticated:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    try:
        rooms = Room.objects.filter(members=str(request.user.id)).reverse()
    except Room.DoesNotExist:
        return 
    
    chat_users_data = []
    members_ids = []

    for room in rooms:
        r = room.members.all()
        serialized_data = RoomMembersIdsAPI(rooms, many=True)

        if len(serialized_data.data):   
            for u in r:
                if not str(u.id) in members_ids:
                    members_ids.append(str(u.id))  

                if not [data for data in chat_users_data if str(data["chat_user_id"]) == str(u.id) and str(data["room_id"]) == str(room.room_id)]:
                    chat_users_data.append(
                        {"chat_user_id": str(u.id),
                        "room_id": str(room.room_id),
                        "last_msg_date_time": str(room.last_msg_date_time)
                        })

    try:
        users = User.objects.filter(id__in=members_ids)
    except User.DoesNotExist:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    serialized_data = UserDataAndRoomAPI(users, many=True)
    
    r = []
    for user in users:
        for rmm in chat_users_data:
            if str(rmm["chat_user_id"]) == str(user.id):
                room_id = rmm["room_id"]
                last_msg_date_time = rmm["last_msg_date_time"]

        r.append({
            "id": str(user.id),
            "name": user.name,
            "last_name": user.last_name,
            "birth_date": user.birth_date,
            "email": user.email,
            "room_id": str(room_id),
            "last_msg_date_time": last_msg_date_time
        })
    sorted_data = sorted(r, key=lambda data: data["last_msg_date_time"])[::-1]
    return Response(sorted_data)

@api_view(["GET"])
def get_user(request, user_id):
    if not request.user.is_authenticated:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    data = []

    try:
        user = User.objects.get(id=str(user_id))
    except User.DoesNotExist:
        return
    
    try:
        if str(request.user.id) != str(user_id):
            rooms_data = Room.objects.filter(members=str(user_id)) 
            room_id = rooms_data.get(members=str(request.user.id)).id 
        else:
            room_id = str(request.user.id) 
    except Room.DoesNotExist:
        room_id = ""

    data.append({
            "id": user.id,
            "name": user.name,
            "last_name": user.last_name,
            "birth_date": user.birth_date,
            "email": user.email,
            "room_id": room_id 
    })

    return Response(data)

@api_view(["GET"])
def get_current_chat_user(request, room_id):
    if not request.user.is_authenticated:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    
    try: 
        my_rooms = Room.objects.filter(
            room_id=str(room_id)) 
    except Room.DoesNotExist:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    serialized_room_data = RoomMembersIdsAPI(my_rooms, many=True)
    return Response(serialized_room_data.data)

@api_view(["GET"])
def get_messages(request, room_id, page_data_num):
    pagination = PageNumberPagination()

    if not request.user.is_authenticated:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    try:
        chat_history = ChatHistory.objects.filter(~Q(hidden_for=request.user.id), Q(sender__id=str(request.user.id))
                            | Q(receivers=str(request.user.id)), room_id=room_id).order_by("-date_time")
    except ChatHistory.DoesNotExist:
        return Response(status=status.HTTP_400_BAD_REQUEST)

    try:
        room = Room.objects.filter(room_id=room_id)
        room.filter(members=str(request.user.id))

    except Room.DoesNotExist:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    if not request.user.is_authenticated or not room.exists():
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    pagination.page_size = page_data_num if page_data_num < chat_history.count() else chat_history.count()

    try:
        chat_history = pagination.paginate_queryset(chat_history, request)  
    except ChatHistory.DoesNotExist:
        return Response(status=status.HTTP_403_FORBIDDEN) 
    
    serialized_data = ChatHistoryAPI(chat_history, many=True) 
    return Response(serialized_data.data)

@api_view(["GET"])
def get_all_my_rooms(request):
    if request.user.is_authenticated:
        data = []

        try:
            my_rooms = Room.objects.filter(members=request.user.id)
        except Room.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        
        for room in my_rooms:
            try:
                unseen_msgs_count = ChatHistory.objects.filter(~Q(sender__id=request.user.id), room_id=room.room_id, seen=False).count()
                num_of_msgs = ChatHistory.objects.filter(room_id=room.room_id).count()
            except ChatHistory.DoesNotExist:
                return Response(status=status.HTTP_400_BAD_REQUEST)
            
            response = {
                "id": room.id,
                "number_of_unseen_msgs": unseen_msgs_count,
                "num_of_msgs": num_of_msgs,
                "room_id": room.room_id,
                "members": [str(member.id) for member in room.members.all()] 
            }

            data.append(response)
    return Response(data)

@api_view(["POST"])
def change_password(request):
    if request.method == "POST":
        data = request.data
        old_password = data.get("oldPassword")
        new_password = data.get("newPassword")
        confirmation = data.get("confirmation")

        containsNumber = re.search(r"\d", new_password) 
        containsCapitalLetter = re.search(r"[A-Z]", new_password)
        containsSmallLetter = re.search(r"[a-z]", new_password)
        containsSpecificCharacter = re.search(
            r"[/,?(){}_[\]#\-*+<>|;:!'\".\\$~@`]", new_password)
        matches_all = containsNumber and containsCapitalLetter and containsSmallLetter and containsSpecificCharacter

        user = authenticate(email=request.user.email, password=old_password)
        
        if not old_password or not new_password or not confirmation:
            return Response("Missing input", status=status.HTTP_404_NOT_FOUND)

        if not matches_all:
            return Response("Please fill password with appropriate format", status=400)

        if old_password == new_password:
            return Response("New password can't be the same as the old one", status=409)

        if new_password != confirmation:
            return Response("Password and confirmation mismatch", status=422)

        if user is not None:
            user.set_password(new_password)
            user.save()
            update_session_auth_hash(request, user)
            return Response("Success", status=status.HTTP_200_OK)
        else:
            return Response("Wrong Password", status=status.HTTP_401_UNAUTHORIZED)

    else:
        return Response("This url is only for POST requests")

@api_view(["DELETE"])
def delete_profile(request):
    if request.method == "DELETE":
        user_data = request.data
        password = user_data.get("password")
        user = authenticate(password=password, email=request.user.email)

        if user is None:
            return Response("Wrong Password", status=status.HTTP_401_UNAUTHORIZED)

        if user is not None:
            user.delete()
            chats = ChatHistory.objects.filter(sender__id=str(request.user.id))
            for chat in chats:
                chat.delete()
            
            return Response("Profile is successfully deleted", status=status.HTTP_200_OK)
