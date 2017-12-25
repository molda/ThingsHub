kill -9 $(lsof -i :80 | grep "total" | awk {'print $2'}) > /dev/null

