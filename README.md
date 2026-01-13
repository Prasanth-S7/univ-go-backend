# To get the dump of the database
docker exec -t univ-pg-test pg_dump -U postgres -d univapptwopointone -F c -f /tmp/mydb.backup

docker cp univ-pg-test:/tmp/mydb.backup ./mydb.backup

# To restore the dump of the database
docker exec -t univ-pg-test pg_restore -U postgres -d univapptwopointone /tmp/mydb.backup

docker exec -it univ-pg-test pg_restore -U postgres -d univapptwopointone /tmp/mydb.backup
