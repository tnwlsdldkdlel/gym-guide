import type { Routine } from "../lib/routine";

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
            "id": "row",
            "sets": 3,
            "reps": "12",
            "kg": 30,
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
            "id": "rdl",
            "sets": 3,
            "reps": "12",
            "kg": 30,
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
            "id": "row",
            "sets": 3,
            "reps": "12",
            "kg": 15,
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
            "id": "rdl",
            "sets": 3,
            "reps": "12",
            "kg": 15,
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
