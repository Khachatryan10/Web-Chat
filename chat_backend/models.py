from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
import uuid

class CustomUserManager(BaseUserManager):
    def create_user(self, email, name, last_name, birth_date, password, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        if not password:
            raise ValueError("Password is required")

        if not name:
            raise ValueError("First name is required")

        if not last_name:
            raise ValueError("Last name is required")

        email = self.normalize_email(email)
        user = self.model(email=email, name=name,
                            last_name=last_name,birth_date=birth_date, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user_account(self, email, name, last_name, password, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self.create_user(email, name, last_name, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=100)
    name = models.CharField(max_length=64, null=True)
    last_name = models.CharField(max_length=64, null=True)
    full_name = models.CharField(max_length=128)
    birth_date = models.DateField()
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(blank=True, null=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"

    REQUIRED_FIELDS = ["name", "last_name", "password"]

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def get_full_name(self):
        return f"{self.name} {self.last_name}" 

    def get_short_name(self):
        return self.name or self.email.split("@")[0]

class ChatHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey("User", on_delete=models.CASCADE, related_name="messages_sent_by")
    content = models.CharField(max_length=10000)
    room_id = models.CharField(max_length=60)
    hidden_for = models.ManyToManyField("User", related_name="is_hidden_for")
    receivers = models.ManyToManyField("User", related_name="chats")
    date_time = models.CharField(max_length=30)
    seen = models.BooleanField(default=False)

class ChatRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender_name = models.CharField(max_length=64)
    sender_last_name = models.CharField(max_length=64)
    sent_by = models.UUIDField(default=None, editable=False)
    sent_to = models.UUIDField(default=None, editable=False)
    date_time = models.CharField(max_length=30, default="")
    
class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=None, editable=False)
    room_id = models.CharField(max_length=60)
    members = models.ManyToManyField("User",  related_name="member_of")
    last_msg_date_time = models.CharField(max_length=30, default="")
