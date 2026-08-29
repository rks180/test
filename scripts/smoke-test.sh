#!/bin/bash
# End-to-end assessment test run (no automated test framework in the project).
set -u
B=http://localhost:3000
pass=0; fail=0
chk() { # chk "name" "expected_substr" "actual"
  if echo "$3" | grep -qF "$2"; then echo "  PASS  $1"; pass=$((pass+1));
  else echo "  FAIL  $1"; echo "        expected ~ '$2'"; echo "        got: $3"; fail=$((fail+1)); fi
}
hr() { echo; echo "=== $1 ==="; }

hr "Task 1.4 - separate collections exist, start empty"
S=$(curl -s $B/api/stats)
echo "  stats: $S"
chk "6 entity collections present" '"agents"' "$S"
chk "policies key present" '"policies"' "$S"

hr "Task 1.1 - upload CSV via worker thread"
UP=$(curl -s -F "file=@data/data-sheet.csv" $B/api/upload)
echo "  $UP"
JOB=$(echo "$UP" | sed -n 's/.*"jobId":"\([^"]*\)".*/\1/p')
chk "returns 202 + jobId" '"jobId"' "$UP"
chk "says worker thread" 'worker thread' "$UP"

# main thread must stay responsive while the worker runs
H=$(curl -s -o /dev/null -w "%{http_code}" $B/health)
chk "main thread not blocked during import (/health 200)" "200" "$H"

echo "  polling job $JOB ..."
for i in $(seq 1 60); do
  J=$(curl -s $B/api/upload/$JOB)
  ST=$(echo "$J" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
  [ "$ST" = "completed" ] && break
  [ "$ST" = "failed" ] && break
  sleep 1
done
echo "  final job: $J"
chk "import completed" '"status":"completed"' "$J"
chk "1198 rows read" '"rowsRead":1198' "$J"
chk "0 rows skipped" '"rowsSkipped":0' "$J"

hr "Task 1.4 - collections populated after import"
S=$(curl -s $B/api/stats); echo "  stats: $S"
chk "agents 3"      '"agents":3'      "$S"
chk "carriers 46"   '"carriers":46'   "$S"
chk "lobs 19"       '"lobs":19'       "$S"
chk "users 1198"    '"users":1198'    "$S"
chk "accounts 1198" '"accounts":1198' "$S"
chk "policies 1198" '"policies":1198' "$S"

hr "Task 1.1 - re-upload is idempotent (counts must not double)"
UP2=$(curl -s -F "file=@data/data-sheet.csv" $B/api/upload)
JOB2=$(echo "$UP2" | sed -n 's/.*"jobId":"\([^"]*\)".*/\1/p')
for i in $(seq 1 60); do
  J=$(curl -s $B/api/upload/$JOB2)
  echo "$J" | grep -q '"status":"completed"' && break
  echo "$J" | grep -q '"status":"failed"' && break
  sleep 1
done
S=$(curl -s $B/api/stats); echo "  stats after re-upload: $S"
chk "policies still 1198" '"policies":1198' "$S"
chk "users still 1198"    '"users":1198'    "$S"

hr "Task 1.2 - search policy info by username"
R=$(curl -s "$B/api/policies/search?username=Lura%20Lucca")
echo "  $R" | head -c 400; echo
chk "matched user Lura Lucca" '"firstname":"Lura Lucca"' "$R"
chk "returns policies array"  '"policies":['            "$R"
chk "policy_number present"   'policy_number'           "$R"
chk "carrier ref populated"   'company_name'            "$R"
chk "agent ref populated"     '"name":"Alex Watson"'    "$R"

R=$(curl -s "$B/api/policies/search?username=lura&exact=true")
chk "exact=true no substring match -> 404" '"error"' "$R"

R=$(curl -s "$B/api/policies/search?username=lura")
chk "case-insensitive substring match works" '"total"' "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" "$B/api/policies/search")
chk "missing username -> 400" "400" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" "$B/api/policies/search?username=zzzznope")
chk "unknown username -> 404" "404" "$R"

hr "Task 1.3 - aggregated policy by each user"
R=$(curl -s "$B/api/policies/aggregate?limit=2")
echo "  $R" | head -c 400; echo
chk "totalUsers 1198"      '"totalUsers":1198' "$R"
chk "per-user policyCount" '"policyCount"'     "$R"
chk "per-user totalPremium" '"totalPremium"'   "$R"
chk "limit respected (page meta)" '"limit":2'  "$R"

P1=$(curl -s "$B/api/policies/aggregate?page=1&limit=1")
P2=$(curl -s "$B/api/policies/aggregate?page=2&limit=1")
U1=$(echo "$P1" | sed -n 's/.*"username":"\([^"]*\)".*/\1/p')
U2=$(echo "$P2" | sed -n 's/.*"username":"\([^"]*\)".*/\1/p')
echo "  page1 user=[$U1]  page2 user=[$U2]"
if [ -n "$U1" ] && [ "$U1" != "$U2" ]; then echo "  PASS  pagination returns different pages"; pass=$((pass+1));
else echo "  FAIL  pagination"; fail=$((fail+1)); fi

R=$(curl -s "$B/api/policies/aggregate?username=Lura%20Lucca")
chk "?username filter -> single user" '"totalUsers":1' "$R"

hr "Task 2.1 - real-time CPU sample endpoint"
R=$(curl -s $B/api/cpu)
echo "  $R" | head -c 300; echo
chk "threshold 70"        '"threshold":70'  "$R"
chk "processCpu present"  'processCpu'      "$R"
chk "systemCpu present"   'systemCpu'       "$R"
chk "history array"       '"history":['     "$R"

hr "Task 2.2 - scheduled message POST service"
# past time -> should be delivered on next poll
PAST=$(curl -s -X POST $B/api/messages -H 'Content-Type: application/json' \
  -d '{"message":"past reminder","day":"2026-08-29","time":"00:01"}')
echo "  past: $PAST"
MID=$(echo "$PAST" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p')
chk "created, status scheduled" '"status":"scheduled"' "$PAST"
chk "sendAt computed"           '"sendAt"'             "$PAST"
chk "past note present"         'past'                 "$PAST"

FUT=$(curl -s -X POST $B/api/messages -H 'Content-Type: application/json' \
  -d '{"message":"future ping","day":"2027-01-01","time":"09:30"}')
chk "future message stays scheduled" '"status":"scheduled"' "$FUT"

BAD=$(curl -s -o /dev/null -w "%{http_code}" -X POST $B/api/messages -H 'Content-Type: application/json' \
  -d '{"message":"","day":"2026/09/01","time":"9am"}')
chk "invalid body -> 400" "400" "$BAD"

BADJSON=$(curl -s -X POST $B/api/messages -H 'Content-Type: application/json' \
  -d '{"message":"ok","day":"2026-13-40","time":"25:99"}')
chk "bad date/time -> validation error" 'must be' "$BADJSON"

G=$(curl -s "$B/api/messages/$MID")
chk "GET /api/messages/:id works" "$MID" "$G"

L=$(curl -s "$B/api/messages?status=scheduled")
chk "GET /api/messages?status=scheduled lists" '"messages":[' "$L"

echo "  waiting up to 75s for the cron poller to deliver the past-due message..."
for i in $(seq 1 75); do
  G=$(curl -s "$B/api/messages/$MID")
  echo "$G" | grep -q '"status":"sent"' && break
  sleep 1
done
echo "  delivered doc: $G"
chk "past message delivered (status sent)" '"status":"sent"' "$G"
chk "sentAt stamped"                       '"sentAt":"2'     "$G"
FUT2=$(curl -s "$B/api/messages?status=scheduled")
chk "future message still scheduled"       'future ping'     "$FUT2"

hr "Brief's exact endpoints (/upload /search /aggregate /scheduleMessage)"
chk "GET /search"          '"policies":['      "$(curl -s "$B/search?username=Lura%20Lucca&limit=1")"
chk "GET /aggregate"       '"policyCount"'     "$(curl -s "$B/aggregate?limit=1")"
chk "POST /scheduleMessage" '"status":"scheduled"' "$(curl -s -X POST $B/scheduleMessage -H 'Content-Type: application/json' -d '{"message":"brief endpoint","day":"2027-01-01","time":"08:00"}')"
UP3=$(curl -s -F "file=@data/data-sheet.csv" $B/upload)
chk "POST /upload accepted" '"jobId"' "$UP3"

hr "Negative / routing"
chk "unknown route -> 404 json" 'Route not found' "$(curl -s $B/api/nope)"
chk "bad collection name rejected -> 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' $B/api/data/foobar)"

echo
echo "==================================================="
echo "  RESULT:  $pass passed, $fail failed"
echo "==================================================="
exit $fail
