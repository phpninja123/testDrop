#!/bin/bash
free -m

#siege -b -c1 -t1M http://localhost:3000/get/time
#cat /var/log/siege.log
siege -c50 -t60S --content-type "application/json" 'http://localhost:3000/post POST {"DT":1544441831,"ID":"352253062308258","PR":161,"TR":71659,"PCK":1235,"PD":13200,"PT":4,"TF":0,"BV":1320,"AC":1504,"EF":0}'

free -m
