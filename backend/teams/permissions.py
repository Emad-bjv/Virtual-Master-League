from rest_framework import permissions

class IsManagerOrAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow managers of an object to edit it.
    Admins have full access. Everyone has read access.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Admins can do anything
        if request.user and request.user.is_staff:
            return True
            
        # Object is a Team
        if hasattr(obj, 'manager'):
            return obj.manager == request.user
            
        # Object is a Player
        if hasattr(obj, 'team'):
            return obj.team.manager == request.user

        return False
