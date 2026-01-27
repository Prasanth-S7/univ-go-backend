# To get the dump of the database
docker exec -t univ-pg-test pg_dump -U postgres -d univapptwopointone -F c -f /tmp/mydb.backup

docker cp univ-pg-test:/tmp/mydb.backup ./mydb.backup

# To restore the dump of the database
docker exec -t univ-postgres pg_restore -U postgres -d univapptwopointone /tmp/mydb.backup

# To generate sha 256 scram for userlist.txt

docker exec -it univ-postgres psql -U postgres -c "SELECT rolpassword FROM pg_authid WHERE rolname='postgres';"
