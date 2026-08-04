from rest_framework import generics, status
from rest_framework.response import Response
from .models import LiveSubstitutionRequest, Match
from .serializers import LiveSubstitutionRequestSerializer


class LiveSubstitutionCreateView(generics.CreateAPIView):
    """
    API endpoint for managers to request a live substitution during a match.
    """
    queryset = LiveSubstitutionRequest.objects.all()
    serializer_class = LiveSubstitutionRequestSerializer
    # permission_classes = [IsAuthenticated] # For Phase 2

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            {"message": "درخواست تعویض با موفقیت ثبت شد و در انتظار تایید ادمین است.", "data": serializer.data},
            status=status.HTTP_201_CREATED, headers=headers
        )
