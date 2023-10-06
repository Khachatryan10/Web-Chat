from django.urls import path
from . import views

urlpatterns = [
    path('', views.index),
    path('get_csrf_token', views.get_csrf_token, name='get_csrf_token'),
    path('login', views.index),
    path('register', views.index),
    path('register_user', views.register_user, name='register_user'),
    path('change_password', views.change_password, name='change_password'),
    path('login_user', views.login_request, name='login_user'),
    path('logout_user', views.logout_user, name='logout_user'),
    path('current_user_info', views.current_user_info, name='current_user_info'),
    path('chat', views.index, name="chat"),
    path('users/<str:search_input>/<int:page_size>',views.users, name="search_users"),
    path("chat/<str:id>/", views.room, name="chat_room_user"),
    path("user/<str:user_id>/", view=views.user, name="user"), 
    path("get_chat_user/<str:id>", views.get_chat_user, name="chat_user"),
    path("notifications_sent_by_me/<str:my_id>/<str:chat_user_id>", views.notifications_sent_by_me, name="get_notifications"),
    path("refuse_request", views.refuse_request, name="refuse_request"),
    path("my_notifications/<int:page_size>", views.my_notifications, name="my_notifications"),
    path("get_chat_rooms", view=views.get_chat_rooms, name="get_chat_rooms"),
    path("get_user/<str:user_id>", view=views.get_user, name="get_user"),
    path("get_chat_members", view=views.get_chat_members, name="get_chat_members"),
    path("get_current_chat_user/<str:room_id>", view=views.get_current_chat_user, name="get_current_chat_user"),
    path("get_messages/<str:room_id>/<int:page_data_num>",views.get_messages, name="messages"),
    path("get_all_my_rooms", view=views.get_all_my_rooms, name="get_all_my_rooms"),
    path("delete_profile", view=views.delete_profile, name="delete_profile"),
]