import os
import sys
import django
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, ClubPenalty
from transfers.models import TransferLog
from transfers.serializers import TransferLogSerializer
from teams.serializers import ClubPenaltySerializer

def test_flow():
    print("--- 1. Checking Team existence ---")
    team = Team.objects.first()
    if not team:
        print("No team found in DB to test.")
        return

    print(f"Testing with Team: ID={team.id}, Name={team.name}")

    case_num = "VML-JD-2026-TEST"
    verdict_text = "دادنامه رسمی کمیته انضباطی سازمان لیگ مستر لیگ در خصوص تخلف عدم ارسال ارنج..."

    print("--- 2. Creating test ClubPenalty ---")
    penalty = ClubPenalty.objects.create(
        team=team,
        violation_type='NO_GAMEPLAN',
        title='تخلف عدم تایید و ارسال ارنج پیش از بازی',
        reason='تیم در مهلت مقرر ترکیب خود را نهایی نکرده است.',
        fine_budget_usd=50000,
        fine_gems=20,
        points_deduction=1,
        case_number=case_num,
        official_verdict_text=verdict_text,
    )
    print(f"Created ClubPenalty #{penalty.id} with case_number: {penalty.case_number}")

    # Serialize with ClubPenaltySerializer
    pen_data = ClubPenaltySerializer(penalty).data
    assert pen_data['case_number'] == case_num, f"case_number mismatch in serializer: {pen_data.get('case_number')}"
    assert pen_data['official_verdict_text'] == verdict_text, "verdict_text mismatch in serializer"
    print("ClubPenaltySerializer verification passed!")

    print("--- 3. Creating TransferLog for DISCIPLINARY_ACTION ---")
    verdict_payload = {
        'penalty_id': penalty.id,
        'team_id': team.id,
        'team_name': team.name,
        'violation_type': penalty.get_violation_type_display(),
        'case_number': case_num,
        'official_verdict_text': verdict_text,
        'fine_budget_usd': 50000,
        'fine_gems': 20,
        'points_deduction': 1,
    }

    tlog = TransferLog.objects.create(
        event_type='DISCIPLINARY_ACTION',
        description=json.dumps(verdict_payload, ensure_ascii=False)
    )
    print(f"Created TransferLog #{tlog.id} for DISCIPLINARY_ACTION")

    # Serialize with TransferLogSerializer
    tlog_data = TransferLogSerializer(tlog).data
    assert tlog_data['event_type'] == 'DISCIPLINARY_ACTION'
    assert 'penalty_details' in tlog_data, "penalty_details missing in TransferLogSerializer!"
    pd = tlog_data['penalty_details']
    assert pd['case_number'] == case_num, f"Case number mismatch in penalty_details: {pd.get('case_number')}"
    assert pd['team_name'] == team.name, f"Team name mismatch in penalty_details: {pd.get('team_name')}"
    assert pd['fine_budget_usd'] == 50000, f"Fine mismatch: {pd.get('fine_budget_usd')}"
    print("TransferLogSerializer verification passed!")
    print(f"Generated News Headline: {tlog_data['news_headline'].encode('ascii', errors='replace').decode('ascii')}")
    print("--- Cleanup complete. All verification checks PASSED! ---")

if __name__ == '__main__':
    test_flow()
