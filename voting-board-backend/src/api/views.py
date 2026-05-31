from rest_framework.decorators import action
from rest_framework import viewsets, status, permissions
from django.contrib.auth import authenticate
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.db.models import F
from django.db import transaction, DatabaseError

from .models import Idea, Vote
from .serializers import IdeaSerializer


class AuthView(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(methods=['post'], detail=False)
    def login(self, request):
        username = request.data['username']
        password = request.data['password']
        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'username': user.username})


class IdeaViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = IdeaSerializer

    def get_queryset(self):
        sort = self.request.query_params.get('sort', 'newest')
        if sort == 'popular':
            return Idea.objects.order_by('-vote_count', '-created_at')
        return Idea.objects.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post', 'delete'])
    def vote(self, request, pk=None):
        idea = self.get_object()
        is_vote = request.method == 'POST'

        try:
            with transaction.atomic():
                if is_vote:
                    _, created = Vote.objects.get_or_create(user=request.user, idea=idea)
                    if not created:
                        return Response({'error': 'Already voted'}, status=status.HTTP_400_BAD_REQUEST)
                    Idea.objects.filter(id=idea.id).update(vote_count=F('vote_count') + 1)
                else:
                    deleted, _ = Vote.objects.filter(user=request.user, idea=idea).delete()
                    if not deleted:
                        return Response({'error': 'No vote to remove'}, status=status.HTTP_400_BAD_REQUEST)
                    Idea.objects.filter(id=idea.id).update(vote_count=F('vote_count') - 1)
        except DatabaseError:
            return Response({'error': 'Something went wrong'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(
            {'status': 'voted'} if is_vote else None,
            status=status.HTTP_201_CREATED if is_vote else status.HTTP_204_NO_CONTENT
        )

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}  # adding request data for serializer
