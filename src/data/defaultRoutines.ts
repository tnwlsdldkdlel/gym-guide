import type { Routine, StoredRoutine } from "../lib/routine";

// 성별별 첫 루틴. 이후 변경은 AI와 상의해서 붙여 넣은 루틴이 DB에 쌓인다
export const DEFAULT_ROUTINES: Record<"m" | "f", Routine> = {
  "m": {
    "note": "처음 시작하는 사람 기준 기본 루틴",
    "weekdayCycle": [
      "upper",
      "lower"
    ],
    "saturday": "cardio",
    "sunday": "rest",
    "core": [
      {
        "id": "plank",
        "sets": 2,
        "reps": "30초",
        "kg": null,
        "restSec": 30
      },
      {
        "id": "deadbug",
        "sets": 2,
        "reps": "한쪽 10회",
        "kg": null,
        "restSec": 30
      },
      {
        "id": "crunch",
        "sets": 2,
        "reps": "15",
        "kg": null,
        "restSec": 30
      },
      {
        "id": "sideplank",
        "sets": 2,
        "reps": "한쪽 20초",
        "kg": null,
        "restSec": 30
      },
      {
        "id": "revcrunch",
        "sets": 2,
        "reps": "12",
        "kg": null,
        "restSec": 30
      },
      {
        "id": "bicycle",
        "sets": 2,
        "reps": "한쪽 10회",
        "kg": null,
        "restSec": 30
      }
    ],
    "days": {
      "upper": {
        "title": "상체날",
        "items": [
          {
            "id": "latpull",
            "sets": 3,
            "reps": "12",
            "kg": 30,
            "restSec": 90
          },
          {
            "id": "dbrow",
            "sets": 3,
            "reps": "12",
            "kg": 10,
            "restSec": 90
          },
          {
            "id": "bench",
            "sets": 3,
            "reps": "12",
            "kg": 10,
            "restSec": 90
          },
          {
            "id": "ohp",
            "sets": 3,
            "reps": "12",
            "kg": 8,
            "restSec": 90
          },
          {
            "id": "lateral",
            "sets": 3,
            "reps": "15",
            "kg": 4,
            "restSec": 60
          }
        ]
      },
      "lower": {
        "title": "하체날",
        "items": [
          {
            "id": "goblet",
            "sets": 3,
            "reps": "12",
            "kg": 12,
            "restSec": 90
          },
          {
            "id": "legpress",
            "sets": 3,
            "reps": "12",
            "kg": 60,
            "restSec": 90
          },
          {
            "id": "dbrdl",
            "sets": 3,
            "reps": "12",
            "kg": 10,
            "restSec": 120
          },
          {
            "id": "bridge",
            "sets": 3,
            "reps": "15",
            "kg": null,
            "restSec": 60
          }
        ]
      },
      "cardio": {
        "title": "유산소",
        "items": [
          {
            "id": "treadmill",
            "sets": 1,
            "reps": "30분",
            "kg": null,
            "restSec": 0
          },
          {
            "id": "bike",
            "sets": 1,
            "reps": "30분",
            "kg": null,
            "restSec": 0
          },
          {
            "id": "elliptical",
            "sets": 1,
            "reps": "30분",
            "kg": null,
            "restSec": 0
          }
        ],
        "pickOne": true
      },
      "rest": {
        "title": "쉬는 날",
        "items": []
      }
    }
  },
  "f": {
    "note": "처음 시작하는 사람 기준 기본 루틴",
    "weekdayCycle": [
      "upper",
      "lower"
    ],
    "saturday": "cardio",
    "sunday": "rest",
    "core": [
      {
        "id": "plank",
        "sets": 2,
        "reps": "20–30초",
        "kg": null,
        "restSec": 30
      },
      {
        "id": "deadbug",
        "sets": 2,
        "reps": "한쪽 8–10회",
        "kg": null,
        "restSec": 30
      },
      {
        "id": "crunch",
        "sets": 2,
        "reps": "12",
        "kg": null,
        "restSec": 30
      },
      {
        "id": "sideplank",
        "sets": 2,
        "reps": "한쪽 15초",
        "kg": null,
        "restSec": 30
      },
      {
        "id": "revcrunch",
        "sets": 2,
        "reps": "10",
        "kg": null,
        "restSec": 30
      },
      {
        "id": "bicycle",
        "sets": 2,
        "reps": "한쪽 8회",
        "kg": null,
        "restSec": 30
      }
    ],
    "days": {
      "upper": {
        "title": "상체날",
        "items": [
          {
            "id": "latpull",
            "sets": 3,
            "reps": "12",
            "kg": 15,
            "restSec": 90
          },
          {
            "id": "dbrow",
            "sets": 3,
            "reps": "12",
            "kg": 5,
            "restSec": 90
          },
          {
            "id": "bench",
            "sets": 3,
            "reps": "12",
            "kg": 4,
            "restSec": 90
          },
          {
            "id": "ohp",
            "sets": 3,
            "reps": "12",
            "kg": 3,
            "restSec": 90
          },
          {
            "id": "lateral",
            "sets": 3,
            "reps": "15",
            "kg": 2,
            "restSec": 60
          }
        ]
      },
      "lower": {
        "title": "하체날",
        "items": [
          {
            "id": "goblet",
            "sets": 3,
            "reps": "12",
            "kg": 6,
            "restSec": 90
          },
          {
            "id": "legpress",
            "sets": 3,
            "reps": "12",
            "kg": 30,
            "restSec": 90
          },
          {
            "id": "dbrdl",
            "sets": 3,
            "reps": "12",
            "kg": 5,
            "restSec": 120
          },
          {
            "id": "bridge",
            "sets": 3,
            "reps": "15",
            "kg": null,
            "restSec": 60
          }
        ]
      },
      "cardio": {
        "title": "유산소",
        "items": [
          {
            "id": "treadmill",
            "sets": 1,
            "reps": "30분",
            "kg": null,
            "restSec": 0
          },
          {
            "id": "bike",
            "sets": 1,
            "reps": "30분",
            "kg": null,
            "restSec": 0
          },
          {
            "id": "elliptical",
            "sets": 1,
            "reps": "30분",
            "kg": null,
            "restSec": 0
          }
        ],
        "pickOne": true
      },
      "rest": {
        "title": "쉬는 날",
        "items": []
      }
    }
  }
};

// 부부 공용 첫 루틴. 남녀 루틴은 구성이 같고 무게만 달라서 무게를 {m, f}로 합친다
const both = (m: Routine["core"], f: Routine["core"]) => m.map((i, n) => ({ ...i, kg: { m: i.kg, f: f[n]!.kg } }));
export const DEFAULT_ROUTINE: StoredRoutine = {
  ...DEFAULT_ROUTINES.m,
  note: "처음 시작하는 부부 기준 기본 루틴",
  core: both(DEFAULT_ROUTINES.m.core, DEFAULT_ROUTINES.f.core),
  days: Object.fromEntries(Object.entries(DEFAULT_ROUTINES.m.days).map(([k, d]) => [k, { ...d, items: both(d.items, DEFAULT_ROUTINES.f.days[k]!.items) }])),
};
