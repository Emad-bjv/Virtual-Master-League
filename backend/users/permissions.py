from rest_framework import permissions


class HasAdminPermission:
    """
    Factory creating a DRF permission class that checks for a specific admin permission key.
    Usage:
        permission_classes = [HasAdminPermission('sensitive_grant_rewards')]
    """
    def __init__(self, perm_key):
        self.perm_key = perm_key

    def __call__(self):
        perm_key = self.perm_key

        class SpecificAdminPermission(permissions.BasePermission):
            message = f"شما مجوز دسترسی به این بخش یا انجام این عملیات ({perm_key}) را ندارید."

            def has_permission(self, request, view):
                user = request.user
                if not (user and user.is_authenticated):
                    return False
                return user.has_admin_perm(perm_key)

        return SpecificAdminPermission()


class CanManageAdmins(permissions.BasePermission):
    """
    Ensures that only superusers or users with `sensitive_admin_rbac_manage` permission
    can view or modify admin accounts.
    """
    message = "تنها مدیران ارشد با مجوز مدیریت ادمین‌ها اجازه دسترسی به این بخش را دارند."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.is_superuser or user.has_admin_perm('sensitive_admin_rbac_manage')


class CanGrantRewards(permissions.BasePermission):
    """
    Permission check for granting mass rewards, gems, and free budget.
    """
    message = "شما مجوز اعطای پاداش و تزریق جم یا بودجه به باشگاه‌ها را ندارید."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.has_admin_perm('sensitive_grant_rewards')


class CanManageClubFinances(permissions.BasePermission):
    """
    Permission check for directly editing club budgets, gems, or wage caps.
    """
    message = "شما مجوز تغییر مستقیم بودجه و منابع مالی باشگاه‌ها را ندارید."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.has_admin_perm('sensitive_club_finances_manage')


class CanApproveFinancial(permissions.BasePermission):
    """
    Permission check for approving/rejecting financial deposits.
    """
    message = "شما مجوز تایید یا رد واریزی‌ها و تراکنش‌های مالی را ندارید."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.has_admin_perm('sensitive_financial_approve')
