from rest_framework.routers import DefaultRouter
from .views import AuthView, IdeaViewSet

router = DefaultRouter()
router.register('auth', AuthView, basename='auth')
router.register('ideas', IdeaViewSet, basename='ideas')

urlpatterns = router.urls

