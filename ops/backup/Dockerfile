FROM postgres:17-alpine
RUN apk add --no-cache python3 ca-certificates && update-ca-certificates
WORKDIR /backup
COPY backup.py /backup/backup.py
USER postgres
ENTRYPOINT ["python3", "/backup/backup.py"]
