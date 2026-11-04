class ApiError(Exception):
    def __init__(self, message, status=400, code=None):
        super().__init__(message)
        self.status = status
        self.code = code


def unauthorized():
    return ApiError("Sessao expirada. Entre novamente.", 401)
