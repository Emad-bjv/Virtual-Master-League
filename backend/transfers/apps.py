from django.apps import AppConfig


class TransfersConfig(AppConfig):
    name = 'transfers'

    def ready(self):
        import transfers.signals

