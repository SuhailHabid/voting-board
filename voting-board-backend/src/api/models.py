from django.db import models
from django.contrib.auth.models import User

class Idea(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    vote_count = models.IntegerField(default=0)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ideas',
    )

    class Meta:
        ordering = ['-created_at']

class Vote(models.Model):
    idea = models.ForeignKey(
        Idea,
        on_delete=models.CASCADE,
        related_name='votes',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='votes',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['idea', 'user'], name='one_vote_per_user')
        ]
