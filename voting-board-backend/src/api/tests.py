from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from .models import Idea, Vote


class SingleVoteRuleTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='suhail',
            password='123'
        )
        self.idea = Idea.objects.create(
            title='Cannot vote twice test',
            description='We should implement a no voting twice test',
            created_by=self.user
        )

        token = Token.objects.create(user=self.user)

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_cannot_vote_twice(self):
        url = f'/api/ideas/{self.idea.id}/vote/'

        res1 = self.client.post(url)
        self.assertEqual(res1.status_code, 201)  # first vote succeeds

        res2 = self.client.post(url)
        self.assertEqual(res2.status_code, 400)  # second vote rejected

        self.assertEqual(Vote.objects.count(), 1)  # DB has exactly one vote
