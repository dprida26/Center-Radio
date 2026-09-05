from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as serve_static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Servimos /media/ siempre (incluso con DEBUG=False): son archivos públicos
# (logo, imágenes de productos) y este entorno no tiene un servidor de
# estáticos/CDN por delante de gunicorn. static() de Django no sirve para
# esto porque internamente se desactiva a sí mismo cuando DEBUG=False.
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve_static, {'document_root': settings.MEDIA_ROOT}),
]
