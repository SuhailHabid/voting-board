from rest_framework import serializers
from .models import Idea

class IdeaSerializer(serializers.ModelSerializer):
    vote_count = serializers.IntegerField(read_only=True)
    has_voted = serializers.SerializerMethodField()
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Idea
        fields = ['id', 'title', 'description', 'vote_count', 'has_voted', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.votes.filter(user=request.user).exists()
        return False