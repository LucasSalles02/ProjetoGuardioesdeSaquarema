class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def unauthorized():
    return ApiError("Sessao expirada. Entre novamente.", 401)
