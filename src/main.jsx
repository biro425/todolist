import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  CalendarDays,
  CheckCheck,
  BookOpen,
  MapPin,
  Bookmark,
  Settings,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  X,
  Check,
  Sun,
  Cloud,
  CloudRain,
  Navigation,
  Plane,
  Download,
  Upload,
  Trash2,
  Copy,
  Grip,
  Clock,
  Repeat,
  SlidersHorizontal,
  Heart,
  ImagePlus,
  ExternalLink,
  Share2,
  Menu,
  CheckCircle2,
  MoreHorizontal,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./fresh.css";
import "./timeline.css";
import "./daylog-paper.css";
const dateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TODAY = dateStr(new Date()),
  uid = () => crypto.randomUUID(),
  shift = (d, n) => {
    let x = new Date(d + "T12:00:00");
    x.setDate(x.getDate() + n);
    return dateStr(x);
  },
  fmt = (d) =>
    new Date(d + "T12:00").toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
const colors = ["#a7c5b5", "#c4b0dd", "#e5bd8b", "#9abbd5", "#de9fa3"];
const seed = {
  items: [
    {
      id: "s1",
      type: "event",
      title: "느긋한 주말, 서울숲 산책",
      date: TODAY,
      time: "16:00",
      endTime: "17:30",
      color: colors[0],
      tag: "일상",
      place: "서울숲",
      note: "좋아하는 플레이리스트와 함께",
      done: false,
    },
    {
      id: "s2",
      type: "task",
      title: "이번 주 읽은 책 정리하기",
      date: TODAY,
      color: colors[1],
      priority: "보통",
      tag: "나를 위한 시간",
      done: false,
    },
    {
      id: "s3",
      type: "task",
      title: "다음 여행 숙소 찾아보기",
      date: TODAY,
      color: colors[2],
      priority: "높음",
      tag: "여행",
      done: false,
    },
    {
      id: "s4",
      type: "event",
      title: "친구와 저녁 약속",
      date: shift(TODAY, 1),
      time: "18:30",
      color: colors[2],
      tag: "약속",
      done: false,
    },
    {
      id: "s5",
      type: "task",
      title: "가볍게 스트레칭 10분",
      date: TODAY,
      color: colors[0],
      priority: "보통",
      tag: "루틴",
      done: true,
    },
    {
      id: "s6",
      type: "record",
      title: "조금 천천히 걸어도 괜찮은 날",
      date: shift(TODAY, -1),
      note: "늘 지나치던 길에서 작은 카페를 발견했다. 할 일을 잠시 내려놓고 좋아하는 커피 한 잔. 이런 시간도 나에게 필요했나 보다.",
      mood: "편안해요",
      tag: "작은 발견",
      color: colors[0],
    },
    {
      id: "s7",
      type: "place",
      title: "도시 한가운데, 잠깐의 초록",
      place: "서울숲",
      lat: 37.5445,
      lng: 127.0374,
      date: shift(TODAY, -2),
      note: "그늘 아래 앉아서 한참을 쉬었다. 다음에는 책 한 권을 챙겨 와야지.",
      tag: "산책",
      rating: "5",
      favorite: true,
      color: colors[0],
    },
    {
      id: "s8",
      type: "bookmark",
      title: "다음 산책을 위한 지도",
      url: "https://map.naver.com",
      date: TODAY,
      tag: "가고 싶은 곳",
      note: "주말에 가볼 장소들을 찾아보기",
      color: colors[2],
    },
  ],
  trips: [],
  shared: false,
  city: "서울",
  onboarding: true,
  hidden: [],
  sample: true,
};
function load() {
  try {
    return JSON.parse(localStorage.getItem("daylog.v1")) || seed;
  } catch {
    return seed;
  }
}
function download(name, text, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function parseQuick(text) {
  let date = TODAY,
    time = "";
  if (text.includes("내일")) date = shift(TODAY, 1);
  if (text.includes("모레")) date = shift(TODAY, 2);
  const m = text.match(
    /(?:(오전|오후)\s*)?(\d{1,2})\s*(?:시|:)(?:\s*(\d{1,2})분?)?/,
  );
  if (m) {
    let h = +m[2];
    if (m[1] === "오후" && h < 12) h += 12;
    if (m[1] === "오전" && h === 12) h = 0;
    if (h < 24 && +(m[3] || 0) < 60)
      time = `${String(h).padStart(2, "0")}:${String(m[3] || 0).padStart(2, "0")}`;
  }
  return {
    title:
      text
        .replace(/내일|모레|오늘/g, "")
        .replace(m?.[0] || "\0", "")
        .trim() || text,
    date,
    time,
    repeat: text.includes("매일") ? "매일" : "없음",
  };
}
const Card = ({ title, icon: Icon, action, children, cls = "" }) => (
  <section className={"card " + cls}>
    <header className="card-head">
      <h2>
        {Icon && <Icon size={17} />} {title}
      </h2>
      {action}
    </header>
    {children}
  </section>
);

function TimeGrid({ mode, selected, items, onAdd, onOpen, onMove, onToday }) {
  const scrollRef = useRef(null);
  const base = new Date(selected + "T12:00:00");
  if (mode === "주") base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const days = Array.from({ length: mode === "주" ? 7 : 1 }, (_, index) => {
    const day = new Date(base);
    day.setDate(day.getDate() + index);
    return dateStr(day);
  });
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minuteValue = (time = "00:00") => {
    const [hour, minute] = time.split(":").map(Number);
    return (hour || 0) * 60 + (minute || 0);
  };
  const rangeLabel = mode === "주" ? `${fmt(days[0])} — ${fmt(days[6])}` : fmt(days[0]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (new Date().getHours() - 2) * 64);
  }, [mode, selected]);

  const addAt = (event, date) => {
    if (event.target.closest(".timeline-event")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes = Math.max(0, Math.min(1430, ((event.clientY - rect.top) / 64) * 60));
    const rounded = Math.floor(rawMinutes / 30) * 30;
    const hour = Math.floor(rounded / 60);
    const minute = rounded % 60;
    const end = Math.min(1439, rounded + 60);
    onAdd("event", {
      date,
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      endTime: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
    });
  };

  return (
    <section className={`time-grid-card ${mode === "주" ? "week-grid" : "day-grid"}`}>
      <header className="time-grid-title">
        <div><span className="panel-index">TIME PLANNER</span><h2>{rangeLabel}</h2></div>
        <div className="calendar-controls">
          <button className="icon" aria-label="이전 기간" onClick={() => onMove(mode === "주" ? -7 : -1)}><ChevronLeft size={16}/></button>
          <button className="text-btn" onClick={onToday}>오늘</button>
          <button className="icon" aria-label="다음 기간" onClick={() => onMove(mode === "주" ? 7 : 1)}><ChevronRight size={16}/></button>
        </div>
      </header>
      <div className="timeline-x-scroll">
        <div className="timeline-inner" style={{ "--day-columns": days.length }}>
          <div className="timeline-days">
            <div className="time-corner">시간</div>
            {days.map((day) => {
              const date = new Date(day + "T12:00:00");
              return <button key={day} className={day === TODAY ? "is-today" : ""} onClick={() => onAdd("event", { date: day })}><strong>{date.getDate()}</strong><span>{["일","월","화","수","목","금","토"][date.getDay()]}</span></button>;
            })}
          </div>
          <div className="all-day-row">
            <div className="all-day-label">하루<br/>종일</div>
            {days.map((day) => <div className="all-day-cell" key={day}>{items.filter(item => item.date === day && ["event","task"].includes(item.type) && !item.time).slice(0,3).map(item => <button key={item.id} style={{ "--event-color": item.color || "#7489b7" }} onClick={() => onOpen(item)}>{item.type === "task" ? "□ " : ""}{item.title}</button>)}</div>)}
          </div>
          <div className="timeline-scroll" ref={scrollRef}>
            <div className="timeline-canvas">
              <div className="time-ruler">{hours.map(hour => <span key={hour} style={{ top: `${hour * 64}px` }}>{String(hour).padStart(2,"0")}:00</span>)}</div>
              {days.map(day => {
                const now = new Date();
                const nowTop = (now.getHours() * 60 + now.getMinutes()) / 60 * 64;
                return <div key={day} className="timeline-day-column" onDoubleClick={(event) => addAt(event, day)} title="빈 시간대를 두 번 눌러 일정을 추가하세요">
                  {day === TODAY && <div className="current-time-line" style={{ top: `${nowTop}px` }}><span/></div>}
                  {items.filter(item => item.date === day && ["event","task"].includes(item.type) && item.time).map(item => {
                    const start = minuteValue(item.time);
                    let end = item.endTime ? minuteValue(item.endTime) : start + 60;
                    if (end <= start) end = start + 60;
                    return <button key={item.id} className={`timeline-event ${item.type}`} style={{ top: `${start / 60 * 64}px`, height: `${Math.max(28, (end - start) / 60 * 64)}px`, "--event-color": item.color || "#7489b7" }} onClick={(event) => { event.stopPropagation(); onOpen(item); }}><span>{item.time}{item.endTime ? `–${item.endTime}` : ""}</span><b>{item.title}</b>{item.place && <small>{item.place}</small>}</button>;
                  })}
                </div>;
              })}
            </div>
          </div>
        </div>
      </div>
      <footer className="time-grid-help"><span>30분 간격</span><span>빈 시간대를 두 번 눌러 일정을 적어보세요.</span></footer>
    </section>
  );
}

function App() {
  const [data, setData] = useState(load),
    [page, setPage] = useState("home"),
    [query, setQuery] = useState(""),
    [modal, setModal] = useState(null),
    [memoryPreview, setMemoryPreview] = useState(null),
    [toast, setToast] = useState(""),
    [selected, setSelected] = useState(TODAY),
    [month, setMonth] = useState(new Date()),
    [quickType, setQuickType] = useState("event"),
    [quick, setQuick] = useState(""),
    [taskView, setTaskView] = useState("리스트"),
    [recordView, setRecordView] = useState("전체"),
    [calView, setCalView] = useState("월"),
    [filter, setFilter] = useState("전체"),
    [sort, setSort] = useState("날짜순"),
    [weather, setWeather] = useState(null),
    [weatherError, setWeatherError] = useState(false),
    [navOpen, setNavOpen] = useState(false),
    [tripFilter, setTripFilter] = useState(""),
    [mapFocus, setMapFocus] = useState(null);
  const notify = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 3200);
  };
  useEffect(() => {
    try {
      localStorage.setItem("daylog.v1", JSON.stringify(data));
    } catch {
      notify("저장 공간이 부족해요. 사진을 줄이거나 백업해 주세요.");
    }
  }, [data]);
  useEffect(() => {
    const cities = {
      서울: [37.57, 126.98],
      부산: [35.18, 129.08],
      제주: [33.5, 126.53],
    };
    const [a, b] = cities[data.city] || cities.서울;
    let live = true;
    setWeather(null);
    setWeatherError(false);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${a}&longitude=${b}&current=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=5`,
    )
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((x) => live && setWeather(x))
      .catch(() => live && setWeatherError(true));
    return () => {
      live = false;
    };
  }, [data.city]);
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") {
        setModal(null);
        setMemoryPreview(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector("#global-search")?.focus();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  const items = data.items.filter((i) =>
    [i.title, i.note, i.tag, i.place]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const save = (item, { keepOpen = false } = {}) => {
    setData((d) => {
      let nextItem = { ...item };
      if (
        ["record", "place"].includes(nextItem.type) &&
        nextItem.trip &&
        (!nextItem.visitOrder || !Number.isFinite(+nextItem.visitOrder))
      ) {
        nextItem.visitOrder =
          d.items
            .filter((i) => i.trip === nextItem.trip && i.id !== nextItem.id)
            .reduce((max, i) => Math.max(max, +i.visitOrder || 0), 0) + 1;
      }
      if (d.items.some((i) => i.id === nextItem.id))
        return {
          ...d,
          items: d.items.map((i) => (i.id === nextItem.id ? nextItem : i)),
        };
      const first = { ...nextItem, id: uid() },
        extra = [];
      if (nextItem.type === "event" && nextItem.repeat && nextItem.repeat !== "없음") {
        for (let n = 1; n < 12; n++) {
          let date = shift(nextItem.date, nextItem.repeat === "매주" ? 7 * n : n);
          if (nextItem.repeat === "매월") {
            let t = new Date(nextItem.date + "T12:00");
            const day = t.getDate();
            t.setDate(1);
            t.setMonth(t.getMonth() + n);
            t.setDate(
              Math.min(
                day,
                new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(),
              ),
            );
            date = dateStr(t);
          }
          extra.push({ ...first, id: uid(), parent: first.id, date });
        }
      }
      return { ...d, items: [...d.items, first, ...extra] };
    });
    if (!keepOpen) setModal(null);
    notify(
      keepOpen
        ? "기록을 저장했어요. 다음 순간도 이어서 남겨보세요."
        : "차곡, 저장했어요",
    );
  };
  const toggle = (id) =>
    setData((d) => {
      const item = d.items.find((i) => i.id === id);
      const next = d.items.map((i) =>
        i.id === id ? { ...i, done: !i.done } : i,
      );
      if (!item.done && item.repeat && item.repeat !== "없음") {
        let date = shift(item.date, item.repeat === "매주" ? 7 : 1);
        if (item.repeat === "매월") {
          let t = new Date(item.date + "T12:00");
          t.setMonth(t.getMonth() + 1);
          date = dateStr(t);
        }
        if (!next.some((i) => i.parent === id))
          next.push({ ...item, id: uid(), parent: id, date, done: false });
      }
      return { ...d, items: next };
    });
  const remove = (id) => {
    setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));
    setModal(null);
    notify("삭제했어요");
  };
  const add = (type = "event", extra = {}) =>
    setModal({
      type,
      title: "",
      date: selected,
      color: colors[0],
      repeat: "없음",
      priority: "보통",
      ...extra,
    });
  const tasks = items.filter((i) => i.type === "task"),
    done = tasks.filter((i) => i.done).length;
  const selectedTrip = data.trips.find((t) => t.id === tripFilter);
  const tripMemories = selectedTrip
    ? items
        .filter((i) => ["record", "place"].includes(i.type) && i.trip === selectedTrip.id)
        .sort(
          (a, b) =>
            (+a.visitOrder || Number.MAX_SAFE_INTEGER) -
              (+b.visitOrder || Number.MAX_SAFE_INTEGER) ||
            a.date.localeCompare(b.date),
        )
    : [];
  const moveTripMemory = (id, direction) =>
    setData((d) => {
      const ordered = d.items
        .filter((i) => ["record", "place"].includes(i.type) && i.trip === tripFilter)
        .sort(
          (a, b) =>
            (+a.visitOrder || Number.MAX_SAFE_INTEGER) -
              (+b.visitOrder || Number.MAX_SAFE_INTEGER) ||
            a.date.localeCompare(b.date),
        );
      const from = ordered.findIndex((i) => i.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= ordered.length) return d;
      [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
      const orders = new Map(ordered.map((i, index) => [i.id, index + 1]));
      return {
        ...d,
        items: d.items.map((i) =>
          orders.has(i.id) ? { ...i, visitOrder: orders.get(i.id) } : i,
        ),
      };
    });
  const nav = [
    ["home", LayoutDashboard, "대시보드"],
    ["calendar", CalendarDays, "캘린더"],
    ["tasks", CheckCheck, "할 일"],
    ["records", BookOpen, "기록"],
    ["places", MapPin, "장소 & 여행"],
    ["bookmarks", Bookmark, "북마크"],
  ];
  const Head = ({ title, sub, children }) => (
    <div className="page-head">
      <div>
        <span className="eyebrow">YOUR EVERYDAY, COLLECTED</span>
        <h1>
          {title}
          <span className="accent">.</span>
        </h1>
        <p>{sub}</p>
      </div>
      <div className="head-actions">
        {children}
        <button
          className="primary"
          onClick={() =>
            add(
              page === "tasks"
                ? "task"
                : page === "records"
                  ? "record"
                  : page === "places"
                    ? "record"
                    : page === "bookmarks"
                      ? "bookmark"
                      : "event",
            )
          }
        >
          {page === "places" ? <MapPin size={16} /> : <Plus size={16} />}
          {page === "places" ? "장소 기록 추가" : "새로 추가"}
        </button>
      </div>
    </div>
  );
  const Row = ({ i }) => (
    <div
      className={"item-row " + (i.done ? "is-done" : "")}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", i.id)}
    >
      {i.type === "task" ? (
        <button
          className={"checkbox " + (i.done ? "checked" : "")}
          aria-label={i.title + " 완료 전환"}
          onClick={() => toggle(i.id)}
        >
          {i.done && <Check size={12} />}
        </button>
      ) : (
        <span className="event-line" style={{ background: i.color }} />
      )}
      <button className="row-main" onClick={() => setModal(i)}>
        <strong>{i.title}</strong>
        <span>
          {i.time || fmt(i.date)}
          {i.place && ` · ${i.place}`}
        </span>
      </button>
      {i.tag && (
        <span className="tag" style={{ color: i.color }}>
          {i.tag}
        </span>
      )}
      <button
        className="icon faint"
        aria-label="항목 편집"
        onClick={() => setModal(i)}
      >
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
  function Calendar({ full = false }) {
    let start = new Date(month.getFullYear(), month.getMonth(), 1);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const days = Array.from({ length: 42 }, (_, n) => {
      let d = new Date(start);
      d.setDate(d.getDate() + n);
      return d;
    });
    return (
      <Card
        cls={"calendar-card " + (full ? "full-calendar" : "")}
        title={`${month.getFullYear()}년 ${month.getMonth() + 1}월`}
        action={
          <div className="calendar-controls">
            <button
              className="icon"
              aria-label="이전 달"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              <ChevronLeft size={15} />
            </button>
            <button
              className="icon"
              aria-label="다음 달"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              <ChevronRight size={15} />
            </button>
            <button
              className="text-btn"
              onClick={() => {
                setMonth(new Date());
                setSelected(TODAY);
              }}
            >
              오늘
            </button>
          </div>
        }
      >
        <div className="weekdays">
          {"월화수목금토일".split("").map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((d) => {
            const ds = dateStr(d),
              ev = items.filter(
                (i) =>
                  i.date === ds &&
                  ["event", "task", "place", "record"].includes(i.type),
              );
            return (
              <div
                key={ds}
                tabIndex="0"
                role="button"
                aria-label={ds + " 날짜 선택"}
                className={
                  "day " +
                  (d.getMonth() !== month.getMonth() ? "muted-day " : "") +
                  (ds === selected ? "selected " : "") +
                  (ds === TODAY ? "today" : "")
                }
                onClick={() => setSelected(ds)}
                onDoubleClick={() => add("event", { date: ds })}
                onKeyDown={(e) => e.key === "Enter" && setSelected(ds)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  let id = e.dataTransfer.getData("text/plain");
                  setData((v) => ({
                    ...v,
                    items: v.items.map((i) =>
                      i.id === id ? { ...i, date: ds } : i,
                    ),
                  }));
                  notify("날짜를 옮겼어요");
                }}
              >
                <span className="day-number">{d.getDate()}</span>
                {ev.slice(0, full ? 3 : 2).map((i) => (
                  <div
                    key={i.id}
                    className={"cal-event " + (i.done ? "done" : "")}
                    style={{ "--event": i.color || colors[0] }}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", i.id)
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      setModal(i);
                    }}
                  >
                    {i.type === "place"
                      ? "⌖ "
                      : i.type === "record"
                        ? "✎ "
                        : i.type === "task"
                          ? "· "
                          : ""}
                    {i.title}
                  </div>
                ))}
                {ev.length > (full ? 3 : 2) && (
                  <small>+{ev.length - (full ? 3 : 2)}개</small>
                )}
              </div>
            );
          })}
        </div>
        <div className="selected-agenda">
          <div className="section-label">
            {fmt(selected)}
            <button
              className="icon"
              onClick={() => add()}
              aria-label="선택 날짜에 추가"
            >
              <Plus size={15} />
            </button>
          </div>
          {items
            .filter(
              (i) => i.date === selected && ["event", "task"].includes(i.type),
            )
            .map((i) => (
              <Row key={i.id} i={i} />
            ))}
          {!items.some(
            (i) => i.date === selected && ["event", "task"].includes(i.type),
          ) && (
            <p className="empty small">
              비워 둔 하루도 좋아요. 새로운 계획을 남겨보세요.
            </p>
          )}
        </div>
      </Card>
    );
  }
  const RecordCard = ({ i, onHover }) => (
    <button
      className="record-tile"
      onClick={() => setMemoryPreview(i)}
      onMouseEnter={() => onHover?.(i)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(i)}
      onBlur={() => onHover?.(null)}
    >
      {i.photo ? (
        <img src={i.photo} alt={i.title} />
      ) : (
        <div
          className={
            "record-cover " + (i.place ? "place-cover" : "")
          }
        >
          <span>
            {i.place ? <MapPin size={29} /> : <BookOpen size={29} />}
          </span>
          <small>
            {i.place ? "A PLACE TO REMEMBER" : "A LITTLE MOMENT"}
          </small>
        </div>
      )}
      <div className="record-copy">
        <span className="meta">
          {fmt(i.date)}
          {i.mood && " · " + i.mood}
        </span>
        <h3>{i.title}</h3>
        <p>{i.note}</p>
        <span className="tag">{i.place || i.tag || "일상 기록"}</span>
      </div>
    </button>
  );
  function exportICS() {
    let esc = (s) =>
      (s || "")
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    const events = data.items
      .filter((i) => i.type === "event")
      .map(
        (i) =>
          `BEGIN:VEVENT\r\nUID:${i.id}@daylog\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\r\n${i.time ? "DTSTART:" + i.date.replaceAll("-", "") + "T" + i.time.replace(":", "") + "00" : "DTSTART;VALUE=DATE:" + i.date.replaceAll("-", "")}\r\nSUMMARY:${esc(i.title)}\r\nDESCRIPTION:${esc(i.note)}\r\nLOCATION:${esc(i.place)}\r\nEND:VEVENT`,
      )
      .join("\r\n");
    download(
      "차곡-캘린더.ics",
      `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Daylog//KO\r\n${events}\r\nEND:VCALENDAR`,
      "text/calendar",
    );
    setData((d) => ({ ...d, shared: true }));
    notify("다른 캘린더에 가져올 수 있는 파일을 만들었어요");
  }
  const Empty = ({
    text = "아직 기록이 없어요",
    type = "record",
    actionLabel = "첫 기록 남기기",
  }) => (
    <div className="empty">
      <span className="empty-symbol">＋</span>
      <p>{text}</p>
      <button className="secondary" onClick={() => add(type)}>
        {actionLabel}
      </button>
    </div>
  );
  return (
    <div className="app">
      <aside className={"sidebar " + (navOpen ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("home");
          }}
        >
          <span className="brand-symbol">▥</span>차곡
          <span className="brand-en">daylog</span>
        </a>
        <div className="workspace">
          <span className="avatar">나</span>
          <div>
            <b>나의 작은 일상</b>
            <small>PERSONAL SPACE</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <span className="nav-label">MY SPACE</span>
        <nav>
          {nav.map(([id, Icon, label]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => {
                setPage(id);
                setNavOpen(false);
                setQuery("");
              }}
            >
              <Icon size={18} />
              {label}
              {id === "tasks" && (
                <span className="count">
                  {tasks.filter((i) => !i.done).length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="little-star">✳</span>
          <p>
            작은 순간들이 모여
            <br />
            나만의 하루가 되니까.
          </p>
          <span>MAKE ROOM FOR YOUR DAY</span>
        </div>
        <button
          className={"settings-nav " + (page === "settings" ? "active" : "")}
          onClick={() => setPage("settings")}
        >
          <Settings size={18} />
          설정 및 데이터
          <span className="local-dot" />
        </button>
        <div className="local-status">
          <span /> 이 기기에 안전하게 저장 중
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon mobile-menu"
              onClick={() => setNavOpen(!navOpen)}
            >
              <Menu size={18} />
            </button>
            <span>내 공간</span>
            <ChevronRight size={13} />
            <b>{nav.find((n) => n[0] === page)?.[2] || "설정"}</b>
          </div>
          <div className="top-right">
            <label className="search">
              <Search size={15} />
              <input
                id="global-search"
                placeholder="내 기록 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>
            <span className="top-date">{fmt(TODAY)}</span>
            <span className="avatar small-avatar">나</span>
          </div>
        </header>
        <div className="content">
          {page === "home" && (
            <div className="home-new">
              <section className="home-hero">
                <div className="home-hero-copy">
                  <span className="hero-kicker">{fmt(TODAY)} · {data.city}</span>
                  <h1>오늘의 이야기를<br />한 줄씩 적어봐요.</h1>
                  <p>해야 할 일도, 마음에 머문 순간도<br />내 공책에 편하게 적어두세요.</p>
                  <div className="hero-actions">
                    <button className="hero-primary" onClick={() => add("record")}><BookOpen size={16}/> 추억 기록하기</button>
                    <button className="hero-ghost" onClick={() => setPage("records")}><MapPin size={16}/> 지난 추억 보기</button>
                  </div>
                </div>
                <div className="hero-weather">
                  <Sun size={18}/>
                  <span>{data.city}</span>
                  <b>{weather ? Math.round(weather.current.temperature_2m) + "°" : "—"}</b>
                </div>
                <div className="hero-caption"><span>memo.</span> 별일 없던 하루도 적어두면<br />소중한 한 페이지가 되니까</div>
              </section>

              <div className="home-shortcuts">
                {[["event", CalendarDays, "일정", "시간을 약속해요", () => add("event")],["task", CheckCheck, "할 일", "가볍게 시작해요", () => add("task")],["record", BookOpen, "추억 기록", "장소와 마음을 함께", () => add("record")],["trip", Plane, "여행 모아보기", "발자국을 둘러봐요", () => setPage("places")]].map(([type, Icon, label, sub, action]) => (
                  <button key={type} onClick={action}><span className={'shortcut-icon '+type}><Icon size={18}/></span><span><b>{label}</b><small>{sub}</small></span><ArrowUpRight size={14}/></button>
                ))}
              </div>

              {data.sample && (
                <div className="sample-note fresh">
                  <span>예시 기록으로 차곡을 둘러보고 있어요.</span>
                  <button onClick={() => setData((d) => ({...d, sample:false, items:d.items.filter((i) => !/^s\d+$/.test(i.id))}))}>내 공간으로 비우기 <ArrowUpRight size={13}/></button>
                </div>
              )}

              <div className="home-editorial-grid">
                <section className="home-panel today-flow">
                  <header className="home-panel-head">
                    <div><span className="panel-index">TODAY</span><h2>오늘의 흐름</h2></div>
                    <button className="soft-link" onClick={() => setPage("calendar")}>캘린더 열기 <ArrowUpRight size={14}/></button>
                  </header>
                  <div className="today-summary">
                    <div className="summary-number">{tasks.filter(i => i.date === TODAY && i.done).length}<span> / {tasks.filter(i => i.date === TODAY).length}</span></div>
                    <div><b>오늘의 작은 완료</b><p>서두르지 않아도 괜찮아요.</p></div>
                    <div className="summary-bar"><span style={{width:`${tasks.filter(i=>i.date===TODAY).length ? tasks.filter(i=>i.date===TODAY&&i.done).length/tasks.filter(i=>i.date===TODAY).length*100 : 0}%`}}/></div>
                  </div>
                  <div className="flow-list">
                    {items.filter(i => i.date === TODAY && ["event","task"].includes(i.type)).slice(0,6).map(i => <Row key={i.id} i={i}/>) }
                    {!items.some(i => i.date === TODAY && ["event","task"].includes(i.type)) && <Empty text="오늘은 아직 여백으로 남아 있어요" type="task"/>}
                  </div>
                  <button className="inline-add" onClick={() => add("task")}><Plus size={15}/> 오늘에 하나 더</button>
                </section>

                <section className="home-panel quick-capture">
                  <header className="home-panel-head"><div><span className="panel-index">QUICK NOTE</span><h2>떠오른 말을 적어요</h2></div><span className="capture-mark">✎</span></header>
                  <div className="pills bright-pills">
                    {[["event","일정"],["task","할 일"],["record","추억"],["bookmark","링크"]].map(([t,l]) => <button key={t} className={quickType===t?"selected-pill":""} onClick={() => setQuickType(t)}>{l}</button>)}
                  </div>
                  <textarea aria-label="빠른 입력" placeholder="‘내일 오후 3시 회의’처럼 편하게 적어보세요" value={quick} onChange={e => setQuick(e.target.value)}/>
                  <div className="capture-bottom"><span>날짜와 시간을 알아서 정리해요</span><button disabled={!quick.trim()} onClick={() => {add(quickType, parseQuick(quick));setQuick("")}}><ArrowUpRight size={17}/></button></div>
                </section>

                <div className="home-calendar-wrap"><Calendar /></div>

                <section className="home-panel memory-feature">
                  <div className="memory-art">
                    <span className="memory-orbit one"/><span className="memory-orbit two"/>
                    <BookOpen size={30}/><span className="photo-label">RECENT MEMORY</span>
                  </div>
                  <div className="memory-copy">
                    {items.filter(i => ["record","place"].includes(i.type)).slice(-1).map(i => <React.Fragment key={i.id}><span>{fmt(i.date)} {i.place && `· ${i.place}`}</span><h2>{i.title}</h2><p>{i.note || "이 순간의 이야기를 조금 더 들려주세요."}</p><button onClick={() => setMemoryPreview(i)}>추억 펼쳐보기 <ArrowUpRight size={14}/></button></React.Fragment>)}
                    {!items.some(i => ["record","place"].includes(i.type)) && <><span>FIRST MEMORY</span><h2>첫 이야기를 남겨볼까요?</h2><p>오늘 마음에 머문 순간을 한 줄로 적어보세요.</p><button onClick={() => add("record")}>기록 시작하기 <ArrowUpRight size={14}/></button></>}
                  </div>
                </section>

                <section className="home-panel places-glance">
                  <header className="home-panel-head"><div><span className="panel-index">MY MAP</span><h2>쌓여가는 발자국</h2></div><button className="soft-link" onClick={() => setPage("places")}>지도 보기 <ArrowUpRight size={14}/></button></header>
                  <div className="places-number"><b>{data.items.filter(i=>["record","place"].includes(i.type)&&i.place).length}</b><span>곳의 기억</span></div>
                  <div className="places-dots">{data.items.filter(i=>["record","place"].includes(i.type)&&i.place).slice(0,5).map((i,n)=><button key={i.id} style={{left:`${14+n*17}%`,top:`${30+(n%2)*27}%`}} aria-label={i.title} onClick={()=>setMemoryPreview(i)}><MapPin size={14}/></button>)}</div>
                  <p>멀리 떠난 여행도, 집 앞의 작은 발견도<br/>모두 나만의 지도가 됩니다.</p>
                  <button className="inline-add" onClick={() => add("record")}><Plus size={15}/> 장소가 담긴 추억</button>
                </section>
              </div>

              {data.onboarding && (
                <section className="onboarding-fresh">
                  <div><span className="panel-index">GETTING STARTED</span><h2>차곡과 친해지는 세 걸음</h2></div>
                  {[["할 일 완료",done>0,()=>setPage("tasks")],["기억 남기기",data.items.some(i=>!/^s\d+$/.test(i.id)&&["record","place"].includes(i.type)),()=>add("record")],["캘린더 내보내기",data.shared,exportICS]].map(([t,b,fn],i)=><button key={t} onClick={fn}><span>{b?<Check size={14}/>:`0${i+1}`}</span><b>{t}</b></button>)}
                  <button className="icon" aria-label="첫 걸음 닫기" onClick={() => setData(d=>({...d,onboarding:false}))}><X size={15}/></button>
                </section>
              )}
            </div>
          )}
          {false && page === "home" && (
            <>
              <Head
                title="오늘도, 차곡차곡"
                sub="해야 할 일부터 기억하고 싶은 순간까지, 당신의 하루를 담아보세요."
              />
              {data.sample && (
                <div className="sample-note">
                  <span>
                    처음 만나는 차곡 · 예시 기록으로 공간을 둘러보세요.
                  </span>
                  <button
                    onClick={() =>
                      setData((d) => ({
                        ...d,
                        sample: false,
                        items: d.items.filter((i) => !/^s\d+$/.test(i.id)),
                      }))
                    }
                  >
                    예시 비우고 시작 <ArrowUpRight size={13} />
                  </button>
                </div>
              )}
              {data.onboarding && (
                <section className="card onboarding">
                  <div className="onboarding-title">
                    <div>
                      <span className="eyebrow">A LITTLE START</span>
                      <h2>첫 걸음</h2>
                    </div>
                    <span className="progress-count">
                      {
                        [
                          done > 0,
                          data.items.some(
                            (i) =>
                              !/^s\d+$/.test(i.id) &&
                              ["record", "place"].includes(i.type),
                          ),
                          data.shared,
                        ].filter(Boolean).length
                      }{" "}
                      / 3
                    </span>
                    <button
                      className="icon"
                      aria-label="첫 걸음 닫기"
                      onClick={() =>
                        setData((d) => ({ ...d, onboarding: false }))
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="onboarding-steps">
                    {[
                      ["할 일 1개 완료하기", done > 0, () => setPage("tasks")],
                      [
                        "기억할 순간 남기기",
                        data.items.some(
                          (i) =>
                            !/^s\d+$/.test(i.id) &&
                            ["record", "place"].includes(i.type),
                        ),
                        () => add("record"),
                      ],
                      ["캘린더 파일 공유하기", data.shared, exportICS],
                    ].map(([t, b, fn], i) => (
                      <button key={t} onClick={fn}>
                        <span
                          className={"step-circle " + (b ? "complete" : "")}
                        >
                          {b ? <Check size={14} /> : `0${i + 1}`}
                        </span>
                        <div>
                          <b>{t}</b>
                          <small>
                            {b
                              ? "잘했어요, 한 걸음 완료"
                              : "작은 시작을 해보세요"}
                          </small>
                        </div>
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="layout-toolbar">
                <span>
                  <Grip size={15} /> 나의 대시보드{" "}
                  <small>일상의 모든 조각, 한눈에</small>
                </span>
                <button
                  onClick={() => {
                    setData((d) => ({ ...d, hidden: [] }));
                    setMonth(new Date());
                    setSelected(TODAY);
                    notify("기본 배치로 돌아왔어요");
                  }}
                >
                  <SlidersHorizontal size={14} /> 기본 배치로
                </button>
              </div>
              <div className="dashboard">
                <div className="dash-col">
                  <Calendar />
                  <Card
                    title="오늘의 할 일"
                    icon={CheckCheck}
                    action={
                      <button
                        className="text-btn"
                        onClick={() => setPage("tasks")}
                      >
                        {done}/{tasks.length} <ArrowUpRight size={14} />
                      </button>
                    }
                  >
                    <div className="task-progress">
                      <span
                        style={{
                          width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    {tasks
                      .filter((i) => i.date <= TODAY)
                      .slice(0, 5)
                      .map((i) => (
                        <Row key={i.id} i={i} />
                      ))}
                  </Card>
                </div>
                <div className="dash-col">
                  <Card
                    title="날씨"
                    icon={Sun}
                    action={
                      <select
                        aria-label="날씨 지역"
                        value={data.city}
                        onChange={(e) =>
                          setData((d) => ({ ...d, city: e.target.value }))
                        }
                      >
                        {["서울", "부산", "제주"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    }
                  >
                    <div className="weather-current">
                      {weather ? (
                        <>
                          <b>{Math.round(weather.current.temperature_2m)}°</b>
                          <div>
                            오늘의 공기<small>잠깐 밖을 걸어볼까요?</small>
                          </div>
                        </>
                      ) : (
                        <p>
                          {weatherError
                            ? "날씨에 연결하지 못했어요"
                            : "날씨를 불러오고 있어요…"}
                        </p>
                      )}
                      <Sun className="weather-sun" size={46} />
                    </div>
                    <div className="forecast">
                      {weather?.daily.time.map((d, n) => {
                        let Icon =
                          weather.daily.weather_code[n] < 3
                            ? Sun
                            : weather.daily.weather_code[n] < 50
                              ? Cloud
                              : CloudRain;
                        return (
                          <div key={d}>
                            <span>
                              {n === 0 ? "오늘" : new Date(d).getDate() + "일"}
                            </span>
                            <Icon
                              size={21}
                              style={{ color: n % 2 ? "#aebed0" : "#e5c88c" }}
                            />
                            <b>
                              {Math.round(weather.daily.temperature_2m_max[n])}°
                            </b>
                            <small>
                              {Math.round(weather.daily.temperature_2m_min[n])}°
                            </small>
                          </div>
                        );
                      })}
                    </div>
                    <div className="attribution">Weather by Open-Meteo</div>
                  </Card>
                  <Card
                    title="앞으로의 일정"
                    icon={CalendarDays}
                    action={
                      <button
                        className="text-btn"
                        onClick={() => setPage("calendar")}
                      >
                        전체 보기 <ArrowUpRight size={13} />
                      </button>
                    }
                  >
                    {items
                      .filter((i) => i.type === "event" && i.date >= TODAY)
                      .sort((a, b) =>
                        (a.date + a.time).localeCompare(b.date + b.time),
                      )
                      .slice(0, 4)
                      .map((i) => (
                        <Row key={i.id} i={i} />
                      ))}
                    <button className="card-add" onClick={() => add("event")}>
                      <Plus size={14} /> 새로운 일정 만들기
                    </button>
                  </Card>
                  <Card
                    title="나의 발자국"
                    icon={MapPin}
                    action={
                      <button
                        className="text-btn"
                        onClick={() => setPage("places")}
                      >
                        지도 보기 <ArrowUpRight size={13} />
                      </button>
                    }
                  >
                    <div className="footprint">
                      <div className="map-art">
                        <MapPin size={24} />
                        <span className="map-orbit" />
                      </div>
                      <div>
                        <span className="eyebrow">PLACES I'VE BEEN</span>
                        <h3>
                          {data.items.filter((i) => i.type === "place").length}
                          개의 장소, 나만의 이야기
                        </h3>
                        <p>익숙한 동네도 여행이 되는 순간.</p>
                      </div>
                    </div>
                    <button className="card-add" onClick={() => add("place")}>
                      <Plus size={14} /> 이 장소 기억하기
                    </button>
                  </Card>
                </div>
                <div className="dash-col">
                  <Card title="빠른 입력" icon={Plus}>
                    <div className="quick-body">
                      <div className="pills">
                        {[
                          ["event", "일정"],
                          ["task", "할 일"],
                          ["record", "기록"],
                          ["bookmark", "북마크"],
                          ["place", "장소"],
                        ].map(([t, l]) => (
                          <button
                            key={t}
                            className={quickType === t ? "selected-pill" : ""}
                            onClick={() => setQuickType(t)}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                      <textarea
                        aria-label="빠른 입력"
                        placeholder="‘내일 오후 3시 회의’처럼 편하게 적어요"
                        value={quick}
                        onChange={(e) => setQuick(e.target.value)}
                      />
                      <div className="quick-footer">
                        <span>
                          <span className="green-dot" /> 입력한 날짜와 시간을
                          알아서
                        </span>
                        <button
                          className="quick-save"
                          aria-label="빠른 입력 확인"
                          disabled={!quick.trim()}
                          onClick={() => {
                            add(quickType, parseQuick(quick));
                            setQuick("");
                          }}
                        >
                          <Check size={17} />
                        </button>
                      </div>
                    </div>
                  </Card>
                  <Card
                    title="기억하고 싶은 순간"
                    icon={BookOpen}
                    action={
                      <button
                        className="text-btn"
                        onClick={() => setPage("records")}
                      >
                        더보기 <ArrowUpRight size={13} />
                      </button>
                    }
                  >
                    {items
                      .filter((i) => i.type === "record")
                      .slice(-1)
                      .map((i) => (
                        <div
                          className="journal-preview"
                          key={i.id}
                          onClick={() => setModal(i)}
                          role="button"
                          tabIndex="0"
                          onKeyDown={(e) => e.key === "Enter" && setModal(i)}
                        >
                          <div className="journal-date">
                            <span>{fmt(i.date)}</span>
                            <span className="mood">
                              ☁ {i.mood || "오늘의 기록"}
                            </span>
                          </div>
                          <span className="quote">“</span>
                          <h3>{i.title}</h3>
                          <p>{i.note}</p>
                          <span className="journal-tag">
                            #{i.tag || "일상"}
                          </span>
                        </div>
                      ))}
                    {!items.some((i) => i.type === "record") && <Empty />}
                  </Card>
                  <Card
                    title="꺼내 보고 싶은 링크"
                    icon={Bookmark}
                    action={
                      <button
                        className="text-btn"
                        onClick={() => setPage("bookmarks")}
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    }
                  >
                    {items
                      .filter((i) => i.type === "bookmark")
                      .slice(0, 2)
                      .map((i) => (
                        <Row key={i.id} i={i} />
                      ))}
                  </Card>
                </div>
              </div>
            </>
          )}
          {page === "calendar" && (
            <>
              <Head
                title="하루를 그리다"
                sub="다가올 날을 계획하고, 지나온 날을 돌아보세요."
              >
                <button className="secondary" onClick={exportICS}>
                  <Share2 size={15} />
                  캘린더 내보내기
                </button>
              </Head>
              <div className="view-toolbar">
                <div className="pills">
                  {["월", "주", "일"].map((v) => (
                    <button
                      className={calView === v ? "selected-pill" : ""}
                      onClick={() => setCalView(v)}
                      key={v}
                    >
                      {v}간
                    </button>
                  ))}
                </div>
                <span>{calView === "월" ? "일정을 끌어서 날짜를 바꿀 수 있어요" : "하루를 30분 단위로 계획해보세요"}</span>
              </div>
              {calView === "월" ? <Calendar full /> : <TimeGrid mode={calView} selected={selected} items={items} onAdd={add} onOpen={setModal} onMove={(amount) => setSelected(shift(selected, amount))} onToday={() => setSelected(TODAY)}/>} 
            </>
          )}
          {page === "tasks" && (
            <>
              <Head
                title="하나씩, 가볍게"
                sub="오늘 해낼 수 있는 만큼. 작은 완료가 쌓이면 충분해요."
              />
              <div className="stats">
                <div>
                  <span>전체 할 일</span>
                  <b>{tasks.length}</b>
                </div>
                <div>
                  <span>완료한 일</span>
                  <b>{done}</b>
                </div>
                <div>
                  <span>달성률</span>
                  <b>
                    {tasks.length ? Math.round((done / tasks.length) * 100) : 0}
                    <small>%</small>
                  </b>
                </div>
              </div>
              <div className="view-toolbar">
                <div className="pills">
                  {["전체", "오늘", "미완료", "완료"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilter(s)}
                      className={filter === s ? "selected-pill" : ""}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="inline">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option>날짜순</option>
                    <option>우선순위</option>
                  </select>
                  <button
                    className="secondary"
                    onClick={() =>
                      setTaskView(taskView === "리스트" ? "4분면" : "리스트")
                    }
                  >
                    {taskView === "리스트" ? "4분면 보기" : "리스트 보기"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setData((d) => ({
                        ...d,
                        items: d.items.map((i) =>
                          i.type === "task" && !i.done && i.date < TODAY
                            ? { ...i, date: TODAY }
                            : i,
                        ),
                      }));
                      notify("밀린 할 일을 오늘로 옮겼어요");
                    }}
                  >
                    밀린 일 오늘로
                  </button>
                </div>
              </div>
              {taskView === "리스트" ? (
                <Card
                  title="나의 할 일"
                  action={
                    <button
                      className="text-btn"
                      onClick={() => {
                        const ids = tasks
                          .filter((i) =>
                            filter === "오늘"
                              ? i.date === TODAY
                              : filter === "미완료"
                                ? !i.done
                                : filter === "완료"
                                  ? i.done
                                  : true,
                          )
                          .map((i) => i.id);
                        ids.forEach((id) => {
                          if (!data.items.find((i) => i.id === id).done)
                            toggle(id);
                        });
                      }}
                    >
                      목록 전체 완료
                    </button>
                  }
                >
                  {tasks
                    .filter((i) =>
                      filter === "오늘"
                        ? i.date === TODAY
                        : filter === "미완료"
                          ? !i.done
                          : filter === "완료"
                            ? i.done
                            : true,
                    )
                    .sort((a, b) =>
                      sort === "날짜순"
                        ? a.date.localeCompare(b.date)
                        : ["높음", "보통", "낮음"].indexOf(a.priority) -
                          ["높음", "보통", "낮음"].indexOf(b.priority),
                    )
                    .map((i) => (
                      <Row key={i.id} i={i} />
                    ))}
                  <button className="card-add" onClick={() => add("task")}>
                    <Plus size={16} /> 할 일 추가
                  </button>
                </Card>
              ) : (
                <div className="matrix">
                  {[
                    ["지금 하기", true, true],
                    ["계획하기", true, false],
                    ["빠르게 처리", false, true],
                    ["여유가 생기면", false, false],
                  ].map(([t, important, urgent]) => (
                    <Card key={t} title={t}>
                      {tasks
                        .filter(
                          (i) =>
                            !i.done &&
                            (i.priority === "높음") === important &&
                            i.date <= TODAY === urgent,
                        )
                        .map((i) => (
                          <Row key={i.id} i={i} />
                        ))}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
          {page === "records" && (
            <>
              <Head
                title="기억을 모으다"
                sub="별일 없는 날에도, 남겨두고 싶은 순간은 있어요."
              />
              <div className="view-toolbar">
                <div className="pills">
                  {["전체", "일상", "장소·여행"].map((v) => (
                    <button
                      key={v}
                      className={recordView === v ? "selected-pill" : ""}
                      onClick={() => setRecordView(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <span>최근 기록부터 차곡차곡</span>
              </div>
              <div className="record-grid">
                {items
                  .filter((i) =>
                    recordView === "일상"
                      ? i.type === "record" && !i.place
                      : recordView === "장소·여행"
                        ? ["record", "place"].includes(i.type) && !!i.place
                        : ["record", "place"].includes(i.type),
                  )
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((i) => (
                    <RecordCard key={i.id} i={i} />
                  ))}
              </div>
              {!items.some((i) => ["record", "place"].includes(i.type)) && (
                <Empty />
              )}
            </>
          )}
          {page === "places" && (
            <>
              <Head
                title="어디든, 나의 여행"
                sub="멀리 떠난 여행도, 집 앞 작은 카페도. 지도 위에 기억을 남겨요."
              >
                <button
                  className="secondary"
                  onClick={() =>
                    setModal({
                      type: "trip",
                      title: "",
                      date: TODAY,
                      endDate: TODAY,
                    })
                  }
                >
                  <Plane size={15} />
                  여행 만들기
                </button>
              </Head>
              <div className="view-toolbar">
                <div className="pills">
                  <button
                    onClick={() => setTripFilter("")}
                    className={!tripFilter ? "selected-pill" : ""}
                  >
                    모든 발자국
                  </button>
                  <button
                    onClick={() => setTripFilter("favorite")}
                    className={tripFilter === "favorite" ? "selected-pill" : ""}
                  >
                    <Heart size={13} />
                    다시 가고 싶은 곳
                  </button>
                  {data.trips.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTripFilter(t.id)}
                      className={tripFilter === t.id ? "selected-pill" : ""}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
              {selectedTrip ? (
                <TripItinerary
                  trip={selectedTrip}
                  memories={tripMemories}
                  onOpen={setMemoryPreview}
                  onMove={moveTripMemory}
                  onAdd={() =>
                    add("record", {
                      trip: selectedTrip.id,
                      date: selectedTrip.date || selected,
                    })
                  }
                  onEditTrip={() => setModal(selectedTrip)}
                />
              ) : (
                <div className="places-layout">
                  <div className="card map-card">
                    <PlaceMap
                      points={items.filter(
                        (i) =>
                          ["record", "place"].includes(i.type) &&
                          Number.isFinite(+i.lat) &&
                          Number.isFinite(+i.lng) &&
                          (!tripFilter ||
                            (tripFilter === "favorite"
                              ? i.favorite
                              : i.trip === tripFilter)),
                      )}
                      focus={mapFocus}
                      onSelect={setMemoryPreview}
                      onPick={(p) => add("record", p)}
                    />
                    <div className="map-caption">
                      <MapPin size={14} /> 지도를 클릭해 새로운 장소를
                      기록해보세요 <span>© OpenStreetMap</span>
                    </div>
                  </div>
                  <div className="place-list">
                    {items
                      .filter(
                        (i) =>
                          ["record", "place"].includes(i.type) &&
                          !!i.place &&
                          (!tripFilter ||
                            (tripFilter === "favorite"
                              ? i.favorite
                              : i.trip === tripFilter)),
                      )
                      .map((i) => (
                        <RecordCard key={i.id} i={i} onHover={setMapFocus} />
                      ))}
                    {!items.some((i) => ["record", "place"].includes(i.type) && i.place) && (
                      <Empty
                        text="첫 번째 발자국을 남겨볼까요?"
                        type="record"
                        actionLabel="장소 기록 추가"
                      />
                    )}
                  </div>
                </div>
              )}
              {data.trips.length > 0 && (
                <div className="trip-list">
                  {data.trips.map((t) => (
                    <section className="card trip-card" key={t.id}>
                      <button className="trip-open" onClick={() => setTripFilter(t.id)}>
                        <Plane size={24} />
                        <h3>{t.title}</h3>
                        <p>{t.date} — {t.endDate}</p>
                        <span>{items.filter((i) => i.trip === t.id).length}개의 기록</span>
                      </button>
                      <div className="trip-card-actions">
                        <button
                          className="trip-add-record"
                          onClick={() =>
                            add("record", {
                              trip: t.id,
                              date: t.date || selected,
                            })
                          }
                        >
                          <Plus size={13} /> 기록 추가
                        </button>
                        <button className="trip-edit" onClick={() => setModal(t)}>
                          여행 정보
                        </button>
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
          {page === "bookmarks" && (
            <>
              <Head
                title="나중에, 다시"
                sub="좋은 글, 가보고 싶은 곳, 영감이 된 링크를 모아두세요."
              />
              <div className="record-grid bookmarks">
                {items
                  .filter((i) => i.type === "bookmark")
                  .map((i) => (
                    <section className="card bookmark-card" key={i.id}>
                      <div className="bookmark-top">
                        <Bookmark size={22} />
                        <button
                          className="icon"
                          aria-label="북마크 편집"
                          onClick={() => setModal(i)}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                      <span className="tag">{i.tag || "저장한 링크"}</span>
                      <h3>{i.title}</h3>
                      <p>{i.note}</p>
                      <div className="bookmark-bottom">
                        <small>
                          {(() => {
                            try {
                              return new URL(i.url).hostname;
                            } catch {
                              return "링크를 추가해 주세요";
                            }
                          })()}
                        </small>
                        {/^https?:\/\//.test(i.url || "") && (
                          <a href={i.url} target="_blank" rel="noreferrer">
                            열기 <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </section>
                  ))}
              </div>
              {!items.some((i) => i.type === "bookmark") && (
                <Empty type="bookmark" text="다시 꺼내볼 링크를 모아보세요" />
              )}
            </>
          )}
          {page === "settings" && (
            <>
              <Head
                title="나에게 맞게"
                sub="내 기록을 관리하고, 다른 캘린더와 이어보세요."
              />
              <section className="settings-overview" aria-label="내 공간 요약">
                {[
                  ["전체 항목", data.items.length],
                  ["일정", data.items.filter((i) => i.type === "event").length],
                  ["여행", data.trips.length],
                  [
                    "사진 있는 기록",
                    data.items.filter(
                      (i) => ["record", "place"].includes(i.type) && i.photo,
                    ).length,
                  ],
                ].map(([label, value]) => (
                  <div className="settings-stat" key={label}>
                    <span>{label}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </section>
              <div className="settings-grid">
                <Card title="데이터 백업 & 복원" icon={Download}>
                  <div className="settings-body">
                    <p>
                      기록은 현재 브라우저에 저장됩니다. 사진을 포함한 전체
                      데이터를 파일로 백업할 수 있어요.
                    </p>
                    <button
                      className="secondary"
                      onClick={() =>
                        download(
                          "차곡-백업.json",
                          JSON.stringify(data, null, 2),
                        )
                      }
                    >
                      <Download size={15} /> 전체 백업
                    </button>
                    <label className="secondary file-label">
                      <Upload size={15} /> 백업 추가로 가져오기
                      <input
                        type="file"
                        accept=".json"
                        onChange={async (e) => {
                          try {
                            let v = JSON.parse(await e.target.files[0].text());
                            if (
                              !Array.isArray(v.items) ||
                              !Array.isArray(v.trips) ||
                              v.items.some(
                                (i) =>
                                  !i.id ||
                                  !i.title ||
                                  !/^\d{4}-\d{2}-\d{2}$/.test(i.date) ||
                                  ![
                                    "event",
                                    "task",
                                    "record",
                                    "place",
                                    "bookmark",
                                  ].includes(i.type),
                              )
                            )
                              throw Error();
                            setData((d) => ({
                              ...d,
                              items: [
                                ...d.items,
                                ...v.items.filter(
                                  (i) => !d.items.some((x) => x.id === i.id),
                                ),
                              ],
                              trips: [
                                ...d.trips,
                                ...v.trips.filter(
                                  (i) => !d.trips.some((x) => x.id === i.id),
                                ),
                              ],
                            }));
                            notify("백업을 병합했어요");
                          } catch {
                            notify("올바른 차곡 백업 파일이 아니에요");
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </Card>
                <Card title="캘린더 연결" icon={CalendarDays}>
                  <div className="settings-body">
                    <p>
                      ICS 파일로 Google·Apple·네이버 캘린더에 일정을 옮길 수
                      있어요. 실시간 계정 동기화는 아직 연결되지 않았습니다.
                    </p>
                    <button className="secondary" onClick={exportICS}>
                      <Share2 size={15} /> ICS 내보내기
                    </button>
                    <label className="secondary file-label">
                      <Upload size={15} /> ICS 가져오기
                      <input
                        type="file"
                        accept=".ics"
                        onChange={async (e) => {
                          try {
                            let t = await e.target.files[0].text();
                            const list = t
                              .replace(/\r?\n[ \t]/g, "")
                              .split("BEGIN:VEVENT")
                              .slice(1)
                              .map((s) => {
                                let title = s
                                    .match(/SUMMARY:(.*)/)?.[1]
                                    ?.trim(),
                                  dt = s.match(
                                    /DTSTART[^:]*:(\d{8})(?:T(\d{2})(\d{2}))?/,
                                  );
                                return title && dt
                                  ? {
                                      id: uid(),
                                      type: "event",
                                      title,
                                      date:
                                        dt[1].slice(0, 4) +
                                        "-" +
                                        dt[1].slice(4, 6) +
                                        "-" +
                                        dt[1].slice(6, 8),
                                      time: dt[2] ? dt[2] + ":" + dt[3] : "",
                                      color: colors[3],
                                    }
                                  : null;
                              })
                              .filter(Boolean);
                            setData((d) => ({
                              ...d,
                              items: [...d.items, ...list],
                            }));
                            notify(
                              `${list.length}개의 일정을 가져왔어요 (기본 날짜·제목 가져오기)`,
                            );
                          } catch {
                            notify("파일을 읽지 못했어요");
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </Card>
                <Card title="내 공간" icon={Settings}>
                  <div className="settings-body">
                    <p>
                      첫 걸음 안내를 다시 보거나 화면의 기본 배치를 복원할 수
                      있어요.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => {
                        setData((d) => ({ ...d, onboarding: true }));
                        setPage("home");
                      }}
                    >
                      첫 걸음 다시 보기
                    </button>
                    <p className="muted">
                      공유 편집·계정 로그인·푸시 알림·모바일 위젯은 서버 및
                      플랫폼 연결이 필요한 후속 기능입니다.
                    </p>
                  </div>
                </Card>
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>
              차곡 <span className="muted">/</span> 하루가 쌓이는 곳
            </span>
            <span>EVERY LITTLE MOMENT COUNTS</span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {memoryPreview && (
        <MemoryViewer
          key={memoryPreview.id}
          memory={memoryPreview}
          trip={data.trips.find((t) => t.id === memoryPreview.trip)}
          tripMemories={data.items
            .filter(
              (item) =>
                ["record", "place"].includes(item.type) &&
                memoryPreview.trip &&
                item.trip === memoryPreview.trip,
            )
            .sort(
              (a, b) =>
                (+a.visitOrder || Number.MAX_SAFE_INTEGER) -
                  (+b.visitOrder || Number.MAX_SAFE_INTEGER) ||
                a.date.localeCompare(b.date),
            )}
          onClose={() => setMemoryPreview(null)}
          onEdit={(target = memoryPreview) => {
            setMemoryPreview(null);
            setModal(target);
          }}
          onAdd={() => {
            const trip = data.trips.find((t) => t.id === memoryPreview.trip);
            setMemoryPreview(null);
            add("record", {
              trip: memoryPreview.trip,
              date: trip?.date || memoryPreview.date || selected,
            });
          }}
        />
      )}
      {modal && (
        <Editor
          key={modal.id || modal.type}
          initial={modal}
          trips={data.trips}
          onClose={() => setModal(null)}
          onSave={(v, options = {}) => {
            if (v.type === "trip") {
              const savedTrip = v.id ? v : { ...v, id: uid() };
              setData((d) => ({
                ...d,
                trips: v.id
                  ? d.trips.map((t) => (t.id === v.id ? savedTrip : t))
                  : [...d.trips, savedTrip],
              }));
              setTripFilter(savedTrip.id);
              setPage("places");
              setModal(null);
              notify("여행을 저장했어요");
            } else save(v, options);
          }}
          onDelete={(id) => {
            if (modal.type === "trip") {
              setData((d) => ({
                ...d,
                trips: d.trips.filter((t) => t.id !== id),
                items: d.items.map((i) =>
                  i.trip === id ? { ...i, trip: "" } : i,
                ),
              }));
              setModal(null);
            } else remove(id);
          }}
          onCopy={(i) => {
            save({ ...i, id: undefined, title: i.title + " (복사)" });
          }}
        />
      )}
    </div>
  );
}

function MemoryViewer({ memory, trip, tripMemories = [], onClose, onEdit, onAdd }) {
  const entries = trip ? tripMemories : [memory];
  const [page, setPage] = useState(trip ? 0 : 1);
  const activeMemory = trip ? entries[page - 1] : memory;
  const totalPages = trip ? entries.length + 1 : 1;
  const placeNames = [...new Set(entries.map((item) => item.place).filter(Boolean))];
  useEffect(() => {
    const turnPage = (event) => {
      if (!trip || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      setPage((current) =>
        event.key === "ArrowRight"
          ? Math.min(totalPages - 1, current + 1)
          : Math.max(0, current - 1),
      );
    };
    window.addEventListener("keydown", turnPage);
    return () => window.removeEventListener("keydown", turnPage);
  }, [trip, totalPages]);
  return (
    <div
      className="memory-viewer-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <article
        className={`memory-viewer ${trip ? "is-trip-book" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${trip?.title || memory.title} 추억책 보기`}
      >
        <button className="memory-viewer-close" onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
        {trip && (
          <div className="memory-book-progress" aria-label={`${page + 1} / ${totalPages} 페이지`}>
            {Array.from({ length: totalPages }, (_, index) => (
              <span key={index} className={page === index ? "active" : ""} />
            ))}
            <b>{page + 1} / {totalPages}</b>
          </div>
        )}
        {trip && page === 0 ? (
          <React.Fragment key="trip-cover">
            <div className="memory-viewer-visual trip-cover-visual memory-page-turn">
              <span className="trip-cover-orbit one" />
              <span className="trip-cover-orbit two" />
              <div className="trip-cover-emblem"><Plane size={34} /></div>
              <small>MY TRAVEL NOTE</small>
              <h2>{trip.title}</h2>
              <p>{trip.date} — {trip.endDate}</p>
              <span className="memory-viewer-page">journey.<br />{trip.date?.slice(5).replace("-", ".")}</span>
            </div>
            <div className="memory-viewer-story trip-cover-story memory-page-turn">
              <div className="memory-viewer-kicker">
                <span>TRIP OVERVIEW</span>
                <span>{entries.length}개의 기록</span>
              </div>
              <h2>{trip.title}</h2>
              <p className="trip-cover-intro">
                {trip.note || "이 여행에서 만난 장소와 순간들을 한 권의 기록으로 모았어요."}
              </p>
              <div className="trip-cover-stats">
                <span><b>{entries.length}</b>기록</span>
                <span><b>{placeNames.length}</b>장소</span>
                <span><b>{entries.filter((item) => item.photo).length}</b>사진</span>
              </div>
              <div className="trip-cover-places">
                {placeNames.slice(0, 8).map((place) => <span key={place}><MapPin size={12} /> {place}</span>)}
                {!placeNames.length && <small>아직 담긴 장소가 없어요.</small>}
              </div>
              <div className="memory-viewer-foot trip-cover-foot">
                <button className="memory-edit" onClick={onAdd}><Plus size={14} /> 이 여행에 기록 추가</button>
                {!!entries.length && <button className="book-next-link" onClick={() => setPage(1)}>첫 장소 펼쳐보기 <ChevronRight size={16} /></button>}
              </div>
            </div>
          </React.Fragment>
        ) : activeMemory ? (
          <React.Fragment key={activeMemory.id}>
            <div className={`memory-viewer-visual memory-page-turn ${activeMemory.photo ? "has-photo" : ""}`}>
              {activeMemory.photo ? (
                <img src={activeMemory.photo} alt="" />
              ) : (
                <div className="memory-viewer-placeholder">
                  <span className="memory-viewer-orbit one" />
                  <span className="memory-viewer-orbit two" />
                  {activeMemory.place ? <MapPin size={36} /> : <BookOpen size={36} />}
                  <small>{activeMemory.place ? "A PLACE TO REMEMBER" : "A LITTLE MOMENT"}</small>
                </div>
              )}
              <span className="memory-viewer-page">memory.<br />{activeMemory.date?.slice(5).replace("-", ".")}</span>
            </div>
            <div className="memory-viewer-story memory-page-turn">
              <div className="memory-viewer-kicker">
                <span>{fmt(activeMemory.date)}</span>
                {trip && <span>{page}번째 기록</span>}
                {activeMemory.mood && <span>오늘의 마음 · {activeMemory.mood}</span>}
              </div>
              <h2>{activeMemory.title}</h2>
              <div className="memory-viewer-meta">
                {activeMemory.place && <span><MapPin size={14} /> {activeMemory.place}</span>}
                {trip && <span><Plane size={14} /> {trip.title}</span>}
                {activeMemory.companion && <span>함께 · {activeMemory.companion}</span>}
              </div>
              {activeMemory.rating && <div className="memory-viewer-rating" aria-label={`${activeMemory.rating}점`}>{"★".repeat(Number(activeMemory.rating))}<span>{"★".repeat(Math.max(0, 5 - Number(activeMemory.rating)))}</span></div>}
              <p className="memory-viewer-note">
                {activeMemory.note || "이날의 이야기는 아직 여백으로 남아 있어요."}
              </p>
              <div className="memory-viewer-foot">
                <div>
                  {activeMemory.tag && <span className="tag">#{activeMemory.tag}</span>}
                  {activeMemory.favorite && <span className="memory-favorite"><Heart size={13} fill="currentColor" /> 다시 가고 싶은 곳</span>}
                </div>
                <button className="memory-edit" onClick={() => onEdit(activeMemory)}>이 기록 수정하기</button>
              </div>
            </div>
          </React.Fragment>
        ) : null}
        {trip && (
          <>
            <button className="memory-page-button prev" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} aria-label="이전 페이지"><ChevronLeft size={20} /></button>
            <button className="memory-page-button next" disabled={page >= totalPages - 1} onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} aria-label="다음 페이지"><ChevronRight size={20} /></button>
          </>
        )}
      </article>
    </div>
  );
}

function TripItinerary({ trip, memories, onOpen, onMove, onAdd, onEditTrip }) {
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState("");
  const mapped = memories
    .map((memory, index) => ({ ...memory, routeNumber: index + 1 }))
    .filter((i) => Number.isFinite(+i.lat) && Number.isFinite(+i.lng));
  const photoCount = memories.filter((i) => i.photo).length;
  const categoryLabel = (memory) => {
    if (memory.tripCategory) return memory.tripCategory;
    if (["restaurant", "fast_food"].includes(memory.kind)) return "식당";
    if (memory.kind === "cafe") return "카페";
    if (["attraction", "museum", "gallery", "viewpoint"].includes(memory.kind))
      return "명소";
    return memory.place ? "장소" : "메모";
  };
  return (
    <section className="trip-itinerary">
      <header className="trip-itinerary-head">
        <div>
          <span className="panel-index">TRIP ROUTE</span>
          <h2>{trip.title}</h2>
          <p>
            {trip.date} — {trip.endDate} · {memories.length}개의 기록 · {mapped.length}곳 · {photoCount}장의 사진
          </p>
        </div>
        <div className="trip-itinerary-actions">
          {!!memories.length && (
            <button className="secondary" onClick={() => onOpen(memories[0])}>
              <BookOpen size={15} /> 여행책 보기
            </button>
          )}
          <button className="secondary" onClick={onEditTrip}>여행 정보</button>
          <button className="primary" onClick={onAdd}><Plus size={15} /> 기록 추가</button>
        </div>
      </header>
      <div className="trip-route-summary">
        <span><Navigation size={15} /> 장소가 있는 기록은 방문 순서대로 실제 도로를 연결해요</span>
        {routeInfo && (
          <strong>
            {(routeInfo.distance / 1000).toFixed(1)}km · 약 {Math.max(1, Math.round(routeInfo.duration / 60))}분
          </strong>
        )}
        {routeError && <small>{routeError}</small>}
      </div>
      <div className="trip-itinerary-layout">
        <div className="trip-route-map-wrap">
          <TripRouteMap
            points={mapped}
            onSelect={onOpen}
            onInfo={setRouteInfo}
            onError={setRouteError}
          />
          <div className="map-caption">
            <MapPin size={14} /> 번호는 방문 순서예요
            <span>© OpenStreetMap · Route by OSRM</span>
          </div>
        </div>
        <div className="trip-stop-list">
          {memories.map((memory, index) => (
            <article className="trip-stop" key={memory.id}>
              <div className="trip-stop-number"><span>{index + 1}</span></div>
              <button className="trip-stop-main" onClick={() => onOpen(memory)}>
                {memory.photo ? (
                  <img src={memory.photo} alt="" />
                ) : (
                  <span className="trip-stop-photo"><MapPin size={20} /></span>
                )}
                <span className="trip-stop-copy">
                  <small>
                    <span className="trip-entry-kind">{categoryLabel(memory)}</span>
                    {fmt(memory.date)}{memory.place ? ` · ${memory.place}` : ""}
                  </small>
                  <b>{memory.title}</b>
                  <em>{memory.note || "이곳의 이야기를 남겨보세요."}</em>
                </span>
              </button>
              <div className="trip-stop-order" aria-label="방문 순서 변경">
                <button disabled={index === 0} onClick={() => onMove(memory.id, -1)} aria-label="앞 순서로">↑</button>
                <button disabled={index === memories.length - 1} onClick={() => onMove(memory.id, 1)} aria-label="뒤 순서로">↓</button>
              </div>
            </article>
          ))}
          {!memories.length && (
            <div className="trip-empty">
              <MapPin size={24} />
              <p>이 여행의 첫 순간을 담아보세요.</p>
              <button className="secondary" onClick={onAdd}>첫 기록 남기기</button>
            </div>
          )}
          {!!memories.length && (
            <button className="trip-add-more" onClick={onAdd}>
              <Plus size={15} /> 이 여행에 기록 하나 더 추가하기
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function PlacePickerMap({ value, onPick }) {
  const ref = useRef();
  const map = useRef();
  const poiLayer = useRef();
  const selectedLayer = useRef();
  const pickRef = useRef(onPick);
  const [pois, setPois] = useState([]);
  const [category, setCategory] = useState("전체");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  pickRef.current = onPick;

  async function loadNearby() {
    if (!map.current || loading) return;
    const center = map.current.getCenter();
    setLoading(true);
    setError("");
    const query = `[out:json][timeout:12];(
      nwr(around:1800,${center.lat},${center.lng})["amenity"~"^(restaurant|cafe|fast_food)$"]["name"];
      nwr(around:1800,${center.lat},${center.lng})["tourism"~"^(attraction|museum|gallery|viewpoint)$"]["name"];
    );out center 90;`;
    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ data: query }),
      });
      if (!response.ok) throw Error();
      const result = await response.json();
      const next = result.elements
        .map((element) => ({
          id: `${element.type}-${element.id}`,
          place: element.tags?.name,
          lat: element.lat ?? element.center?.lat,
          lng: element.lon ?? element.center?.lon,
          kind: element.tags?.amenity || element.tags?.tourism || "place",
        }))
        .filter(
          (place) =>
            place.place && Number.isFinite(+place.lat) && Number.isFinite(+place.lng),
        );
      setPois(next);
      if (!next.length) setError("이 주변에는 표시할 장소 정보가 아직 없어요.");
    } catch {
      setError("주변 장소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    setLoading(false);
  }

  useEffect(() => {
    const initial =
      Number.isFinite(+value.lat) && Number.isFinite(+value.lng)
        ? [+value.lat, +value.lng]
        : [37.5665, 126.978];
    map.current = L.map(ref.current, { zoomControl: true }).setView(initial, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map.current);
    poiLayer.current = L.layerGroup().addTo(map.current);
    selectedLayer.current = L.layerGroup().addTo(map.current);
    const timer = setTimeout(() => {
      map.current?.invalidateSize();
      loadNearby();
    }, 180);
    return () => {
      clearTimeout(timer);
      map.current.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || !selectedLayer.current) return;
    selectedLayer.current.clearLayers();
    if (!Number.isFinite(+value.lat) || !Number.isFinite(+value.lng)) return;
    L.circleMarker([+value.lat, +value.lng], {
      radius: 11,
      color: "#fffdf6",
      weight: 4,
      fillColor: "#6c8a6a",
      fillOpacity: 1,
    })
      .addTo(selectedLayer.current)
      .bindTooltip(value.place || "선택한 장소", { permanent: false });
    map.current.setView([+value.lat, +value.lng], Math.max(map.current.getZoom(), 15));
  }, [value.lat, value.lng, value.place]);

  useEffect(() => {
    if (!poiLayer.current) return;
    poiLayer.current.clearLayers();
    const visible = pois.filter((place) => {
      if (category === "식당") return ["restaurant", "fast_food"].includes(place.kind);
      if (category === "카페") return place.kind === "cafe";
      if (category === "명소") return ["attraction", "museum", "gallery", "viewpoint"].includes(place.kind);
      return true;
    });
    visible.forEach((place) => {
      const isFood = ["restaurant", "fast_food"].includes(place.kind);
      const isCafe = place.kind === "cafe";
      L.circleMarker([+place.lat, +place.lng], {
        radius: 8,
        color: "#fffdf6",
        weight: 3,
        fillColor: isCafe ? "#b8835a" : isFood ? "#c0868d" : "#7d9bb5",
        fillOpacity: 0.96,
      })
        .addTo(poiLayer.current)
        .bindTooltip(document.createTextNode(place.place))
        .on("click", () => pickRef.current(place));
    });
  }, [pois, category]);

  return (
    <section className="place-picker">
      <div className="place-picker-head">
        <div>
          <b>지도에서 장소 고르기</b>
          <small>지도를 옮긴 뒤 주변 장소 보기를 눌러보세요.</small>
        </div>
        <button type="button" className="secondary" onClick={loadNearby} disabled={loading}>
          {loading ? "찾는 중…" : "이 지역 주변 장소"}
        </button>
      </div>
      <div className="place-category-pills">
        {["전체", "식당", "카페", "명소"].map((name) => (
          <button
            type="button"
            key={name}
            className={category === name ? "active" : ""}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="place-picker-map" ref={ref} />
      <div className="place-picker-foot">
        <span><i className="poi-dot food" /> 식당</span>
        <span><i className="poi-dot cafe" /> 카페</span>
        <span><i className="poi-dot sight" /> 명소</span>
        {value.place && <strong><MapPin size={13} /> {value.place} 선택됨</strong>}
      </div>
      {error && <p className="place-picker-error">{error}</p>}
    </section>
  );
}

function TripRouteMap({ points, onSelect, onInfo, onError }) {
  const ref = useRef();
  const map = useRef();
  const markerLayer = useRef();
  const routeLayer = useRef();
  const routeKey = points.map((p) => `${p.id}:${p.lng},${p.lat}`).join("|");
  useEffect(() => {
    map.current = L.map(ref.current, { zoomControl: true }).setView(
      [37.55, 126.99],
      12,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map.current);
    markerLayer.current = L.layerGroup().addTo(map.current);
    routeLayer.current = L.layerGroup().addTo(map.current);
    return () => map.current.remove();
  }, []);
  useEffect(() => {
    if (!map.current) return;
    markerLayer.current.clearLayers();
    routeLayer.current.clearLayers();
    onInfo(null);
    onError("");
    points.forEach((point, index) => {
      const marker = L.marker([+point.lat, +point.lng], {
        icon: L.divIcon({
          className: "trip-number-marker",
          html: `<span><b>${point.routeNumber || index + 1}</b></span>`,
          iconSize: [32, 38],
          iconAnchor: [16, 36],
        }),
      })
        .addTo(markerLayer.current)
        .bindTooltip(document.createTextNode(point.place || point.title));
      marker.on("click", () => onSelect(point));
    });
    if (points.length) {
      map.current.fitBounds(
        points.map((p) => [+p.lat, +p.lng]),
        { padding: [46, 46], maxZoom: 14 },
      );
    }
    if (points.length < 2) return;
    const controller = new AbortController();
    const coordinates = points.map((p) => `${+p.lng},${+p.lat}`).join(";");
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((result) => {
        if (result.code !== "Ok" || !result.routes?.[0]) throw Error();
        const route = result.routes[0];
        const latLngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        L.polyline(latLngs, {
          color: "#6c8a6a",
          weight: 5,
          opacity: 0.86,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(routeLayer.current);
        map.current.fitBounds(latLngs, { padding: [46, 46] });
        onInfo({ distance: route.distance, duration: route.duration });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        L.polyline(
          points.map((p) => [+p.lat, +p.lng]),
          { color: "#9a92c4", weight: 3, opacity: 0.65, dashArray: "7 8" },
        ).addTo(routeLayer.current);
        onError("도로 경로를 불러오지 못해 장소 사이를 임시 선으로 표시했어요.");
      });
    return () => controller.abort();
  }, [routeKey]);
  return <div className="trip-route-map" ref={ref} />;
}

function PlaceMap({ points, focus, onPick, onSelect }) {
  const ref = useRef(),
    map = useRef(),
    layer = useRef(),
    markers = useRef(new globalThis.Map());
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  useEffect(() => {
    map.current = L.map(ref.current, { zoomControl: true }).setView(
      [37.55, 126.99],
      12,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    map.current.on("click", (e) =>
      pickRef.current({
        lat: +e.latlng.lat.toFixed(5),
        lng: +e.latlng.lng.toFixed(5),
      }),
    );
    return () => map.current.remove();
  }, []);
  useEffect(() => {
    layer.current.clearLayers();
    markers.current.clear();
    const valid = points.filter(
      (p) =>
        Number.isFinite(+p.lat) &&
        Number.isFinite(+p.lng) &&
        p.lat !== undefined,
    );
    valid.forEach((p) => {
      const marker = L.circleMarker([+p.lat, +p.lng], {
        radius: 10,
        color: "#d7e9db",
        weight: 3,
        fillColor: "#528a72",
        fillOpacity: 1,
      })
        .addTo(layer.current)
        .bindTooltip(document.createTextNode(p.place || p.title))
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onSelect(p);
        });
      markers.current.set(p.id, marker);
    });
    if (valid.length)
      map.current.fitBounds(
        valid.map((p) => [+p.lat, +p.lng]),
        { padding: [50, 50], maxZoom: 14 },
      );
  }, [points]);
  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((marker, id) =>
      marker.setStyle({
        radius: focus?.id === id ? 14 : 10,
        color: focus?.id === id ? "#fff9e9" : "#d7e9db",
        weight: focus?.id === id ? 5 : 3,
        fillColor: focus?.id === id ? "#315f50" : "#528a72",
      }),
    );
    if (
      focus &&
      Number.isFinite(+focus.lat) &&
      Number.isFinite(+focus.lng)
    ) {
      map.current.flyTo(
        [+focus.lat, +focus.lng],
        Math.max(map.current.getZoom(), 15),
        { animate: true, duration: 0.55 },
      );
      markers.current.get(focus.id)?.openTooltip();
    }
  }, [focus]);
  return <div className="leaflet-map" ref={ref} />;
}
function Editor({ initial, trips, onClose, onSave, onDelete, onCopy }) {
  const [v, setV] = useState({ ...initial }),
    [places, setPlaces] = useState([]),
    [finding, setFinding] = useState(false),
    [err, setErr] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const change = (k, x) => setV((s) => ({ ...s, [k]: x }));
  const field = (k, label, type = "text") => (
    <label className="field">
      {label}
      <input
        type={type}
        step={type === "number" ? "any" : undefined}
        required={type === "date"}
        value={v[k] || ""}
        onChange={(e) => change(k, e.target.value)}
      />
    </label>
  );
  const names = {
    event: "일정",
    task: "할 일",
    record: "추억 기록",
    place: "추억 기록",
    bookmark: "북마크",
    trip: "여행",
  };
  async function searchPlace() {
    if (!v.place?.trim()) return;
    setFinding(true);
    setErr("");
    try {
      let r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=4&q=${encodeURIComponent(v.place)}`,
      );
      if (!r.ok) throw Error();
      let x = await r.json();
      setPlaces(x);
      if (!x.length)
        setErr(
          "검색 결과가 없어요. 좌표를 입력하거나 지도에서 핀을 선택해 주세요.",
        );
    } catch {
      setErr(
        "장소 검색에 연결하지 못했어요. 지도에서 핀을 선택하거나 좌표를 입력해 주세요.",
      );
    }
    setFinding(false);
  }
  async function photo(file) {
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return setErr("이미지 파일을 선택해 주세요.");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let c = document.createElement("canvas");
        let scale = Math.min(1, 1000 / img.width);
        c.width = img.width * scale;
        c.height = img.height * scale;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        change("photo", c.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={names[v.type] + " 편집"}
      >
        <header>
          <div>
            <span className="eyebrow">COLLECT YOUR DAY</span>
            <h2>
              {names[v.type]} {v.id ? "수정" : "남기기"}
            </h2>
          </div>
          <button className="icon" onClick={onClose} aria-label="닫기">
            <X size={21} />
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr("");
            if (!v.title?.trim()) return setErr("제목을 입력해 주세요.");
            if (v.type === "bookmark" && !/^https?:\/\//.test(v.url || ""))
              return setErr("https://로 시작하는 링크를 입력해 주세요.");
            if (
              ["record", "place"].includes(v.type) &&
              ((v.type === "place" && !v.place?.trim()) ||
                (v.place?.trim() &&
                  (v.lat === undefined ||
                    v.lng === undefined ||
                    v.lat === "" ||
                    v.lng === "" ||
                    !Number.isFinite(+v.lat) ||
                    Math.abs(+v.lat) > 90 ||
                    !Number.isFinite(+v.lng) ||
                    Math.abs(+v.lng) > 180)))
            )
              return setErr("검색 결과나 지도에서 장소를 선택해 주세요.");
            if (v.type === "trip" && v.endDate < v.date)
              return setErr("여행 종료일을 시작일 이후로 설정해 주세요.");
            const keepAdding =
              e.nativeEvent.submitter?.value === "save-and-continue";
            onSave({ ...v, title: v.title.trim() }, { keepOpen: keepAdding });
            if (keepAdding) {
              setV({
                type: "record",
                title: "",
                date: v.date,
                trip: v.trip,
                color: v.color || colors[0],
                companion: v.companion || "",
              });
              setPlaces([]);
            }
          }}
        >
          <div className="modal-body">
            <input
              autoFocus
              className="title-input"
              aria-label="제목"
              placeholder={
                ["record", "place"].includes(v.type)
                  ? "어떤 순간을 기억할까요?"
                  : "어떤 하루를 남겨볼까요?"
              }
              value={v.title}
              onChange={(e) => change("title", e.target.value)}
            />
            <div className="form-grid">
              {field("date", v.type === "trip" ? "여행 시작" : "날짜", "date")}
              {v.type === "trip"
                ? field("endDate", "여행 종료", "date")
                : field("tag", "태그 / 분류")}
            </div>
            {["event", "task"].includes(v.type) && (
              <>
                <div className="form-grid">
                  {field("time", "시작 시간", "time")}
                  {field("endTime", "종료 시간", "time")}
                </div>
                <div className="form-grid">
                  <label className="field">
                    반복
                    <select
                      value={v.repeat || "없음"}
                      onChange={(e) => change("repeat", e.target.value)}
                    >
                      {["없음", "매일", "매주", "매월"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                    <small>{v.type === "task" ? "완료하면 다음 회차가 생성됩니다." : "새 일정 저장 시 12회가 생성됩니다. 수정은 선택한 회차에 적용됩니다."}</small>
                  </label>
                  <label className="field">
                    우선순위
                    <select
                      value={v.priority || "보통"}
                      onChange={(e) => change("priority", e.target.value)}
                    >
                      {["높음", "보통", "낮음"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {v.type === "task" && (
                  <label className="field">
                    하위 할 일 (한 줄에 하나)
                    <textarea
                      placeholder="작은 단계로 나눠보세요"
                      value={v.subtasks || ""}
                      onChange={(e) => change("subtasks", e.target.value)}
                    />
                    {v.subtasks
                      ?.split("\n")
                      .filter(Boolean)
                      .map((s, n) => (
                        <label className="subtask" key={n}>
                          <input
                            type="checkbox"
                            checked={!!v.subdone?.[n]}
                            onChange={(e) =>
                              change("subdone", {
                                ...v.subdone,
                                [n]: e.target.checked,
                              })
                            }
                          />
                          {s}
                        </label>
                      ))}
                  </label>
                )}
              </>
            )}
            {v.type === "bookmark" && field("url", "링크 URL", "url")}
            {["event", "record", "place"].includes(v.type) && (
              <>
                <label className="field">
                  {["record", "place"].includes(v.type) ? "장소 (선택)" : "장소"}
                  <div className="inline">
                    <input
                      placeholder="장소 또는 주소 검색"
                      value={v.place || ""}
                      onChange={(e) => change("place", e.target.value)}
                    />
                    <button
                      type="button"
                      className="secondary"
                      disabled={finding}
                      onClick={searchPlace}
                    >
                      {finding ? "검색 중…" : "검색"}
                    </button>
                    {["record", "place"].includes(v.type) && (
                      <button
                        type="button"
                        className="icon"
                        aria-label="현재 위치"
                        onClick={() =>
                          navigator.geolocation
                            ? navigator.geolocation.getCurrentPosition(
                                (p) =>
                                  setV((x) => ({
                                    ...x,
                                    lat: p.coords.latitude,
                                    lng: p.coords.longitude,
                                  })),
                                () =>
                                  setErr(
                                    "위치 권한 또는 위치 정보를 확인해 주세요.",
                                  ),
                              )
                            : setErr(
                                "이 브라우저는 위치 정보를 지원하지 않아요.",
                              )
                        }
                      >
                        <Navigation size={18} />
                      </button>
                    )}
                  </div>
                </label>
                {places.map((p) => (
                  <button
                    type="button"
                    className="place-result"
                    key={p.place_id}
                    onClick={() => {
                      setV((x) => ({
                        ...x,
                        place: p.display_name.split(",")[0],
                        lat: +p.lat,
                        lng: +p.lon,
                      }));
                      setPlaces([]);
                    }}
                  >
                    <MapPin size={16} />
                    {p.display_name}
                  </button>
                ))}
                {["record", "place"].includes(v.type) && (
                  <>
                    <PlacePickerMap
                      value={v}
                      onPick={(place) =>
                        setV((current) => ({ ...current, ...place }))
                      }
                    />
                    {v.trip && (
                      <>
                        <div className="trip-linked-notice">
                          <Plane size={15} />
                          <span>
                            <b>{trips.find((trip) => trip.id === v.trip)?.title || "선택한 여행"}</b>
                            에 자동으로 기록됩니다.
                          </span>
                        </div>
                        <div className="form-grid">
                          <label className="field">
                            여행 기록 종류
                            <select
                              value={v.tripCategory || "장소"}
                              onChange={(e) => change("tripCategory", e.target.value)}
                            >
                              {["장소", "명소", "식당", "카페", "숙소", "이동", "메모"].map((category) => (
                                <option key={category}>{category}</option>
                              ))}
                            </select>
                          </label>
                          {field("visitOrder", "방문 / 기록 순서", "number")}
                        </div>
                      </>
                    )}
                    <div className="form-grid compact-record-options">
                      <label className="subtask">
                        <input
                          type="checkbox"
                          checked={!!v.favorite}
                          onChange={(e) => change("favorite", e.target.checked)}
                        />
                        다시 가고 싶은 곳
                      </label>
                      <span />
                    </div>
                    {field("companion", "함께한 사람")}
                  </>
                )}
              </>
            )}
            {["record", "place"].includes(v.type) && (
              <label className="photo-input">
                {v.photo ? (
                  <img src={v.photo} alt="첨부 사진" />
                ) : (
                  <>
                    <ImagePlus size={24} />
                    <span>사진으로 기억하기</span>
                    <small>클릭하여 사진을 추가하세요</small>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => photo(e.target.files[0])}
                />
              </label>
            )}
            <label className="field">
              {["record", "place"].includes(v.type)
                ? "이 순간의 이야기"
                : "메모"}
              <textarea
                rows="4"
                placeholder="기억하고 싶은 이야기를 편하게 적어요."
                value={v.note || ""}
                onChange={(e) => change("note", e.target.value)}
              />
            </label>
            <div className="color-picker">
              <span>기록 색상</span>
              {colors.map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label={c + " 색상"}
                  style={{ background: c }}
                  className={v.color === c ? "picked" : ""}
                  onClick={() => change("color", c)}
                />
              ))}
            </div>
            {err && (
              <p className="form-error" role="alert">
                {err}
              </p>
            )}
          </div>
          <footer className="modal-footer">
            <div>
              {v.id && (
                <>
                  <button
                    type="button"
                    className="icon danger"
                    aria-label="삭제"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 size={17} />
                  </button>
                  {v.type !== "trip" && (
                    <button
                      type="button"
                      className="icon"
                      aria-label="복제"
                      onClick={() => onCopy(v)}
                    >
                      <Copy size={17} />
                    </button>
                  )}
                </>
              )}
            </div>
            {confirmDelete ? (
              <div className="inline">
                <span>삭제할까요?</span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setConfirmDelete(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => onDelete(v.id)}
                >
                  삭제
                </button>
              </div>
            ) : (
              <div className="inline">
                <button type="button" className="secondary" onClick={onClose}>
                  취소
                </button>
                {!v.id && ["record", "place"].includes(v.type) && v.trip && (
                  <button
                    className="secondary save-continue"
                    type="submit"
                    value="save-and-continue"
                  >
                    <Plus size={15} />
                    저장 후 하나 더
                  </button>
                )}
                <button className="primary" type="submit">
                  <Check size={16} />
                  저장하기
                </button>
              </div>
            )}
          </footer>
        </form>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
