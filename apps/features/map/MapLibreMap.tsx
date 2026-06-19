'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { CAMPUSES, type CampusId } from '@/lib/constants/campuses';
import { StationPin } from './StationPin';
import {
  NearbyBuildingsDrawer,
  type NearbyVoteBuilding,
} from './NearbyBuildingsDrawer';
import { nearestBuildings } from './voting';
import type { MapVoteBuilding } from './queries';
import type { StationWithRelations } from './types';

interface Props {
  stations: StationWithRelations[];
  campusId: CampusId;
  /** 投票モードで近接抽出する、座標付きの建物一覧（投票数つき）。 */
  voteBuildings: MapVoteBuilding[];
  onStationClick?: (station: StationWithRelations) => void;
}

const STYLE_URL = '/map-style/style.json';

/** タップ地点の周辺で表示する近接建物の最大件数。 */
const NEARBY_LIMIT = 5;

// 投票モード切替ボタンのアイコン（lucide MapPin と同等）。MapLibre のコントロールは
// 命令的 DOM のため、React コンポーネントではなくインライン SVG で描画する。
const VOTE_TOGGLE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';

/**
 * Renders the campus map with MapLibre GL + OpenFreeMap vector tiles.
 *
 * Station pins are MapLibre Markers whose DOM elements host a React-rendered
 * {@link StationPin} via portal, so they keep Tailwind styling and click
 * handlers. The current-location pin is a custom blue Marker tracked via
 * `watchPosition` (visually distinct from the teal station droplets); the
 * GeolocateControl button only recenters on demand and never auto-follows.
 *
 * maplibre-gl is browser-only, so this component must be loaded with
 * `dynamic(..., { ssr: false })` from a Client Component.
 */
export default function MapLibreMap({
  stations,
  campusId,
  voteBuildings,
  onStationClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const campusIdRef = useRef(campusId);
  const isFirstCampusEffect = useRef(true);
  const [mapReady, setMapReady] = useState(false);
  // 地図(タイル/スタイル)読み込み完了とピン配置完了の2段階。ピンの方が早く
  // 終わるため、両方が揃うまでローディングオーバーレイを表示し続ける。
  const [mapLoaded, setMapLoaded] = useState(false);
  const [pinsReady, setPinsReady] = useState(false);
  const [pins, setPins] = useState<
    { station: StationWithRelations; el: HTMLElement }[]
  >([]);

  // --- 設置希望の投票モード ---------------------------------------------------
  const [voteMode, setVoteMode] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // タップ地点で抽出した近接候補(建物ID + タップ地点からの距離)。票数は
  // effectiveBuildings から都度引くため、ここには保持しない。
  const [candidateRefs, setCandidateRefs] = useState<
    { buildingId: string; distanceMeters: number }[]
  >([]);
  // 投票後の最新票数(建物ID→票数)。サーバー由来の voteBuildings へ合成することで、
  // prop を state にコピーせず(=同期 effect 不要で)その場更新を反映する。
  const [voteOverrides, setVoteOverrides] = useState<Record<string, number>>(
    {}
  );
  // 投票モード切替ボタン(MapLibre コントロール)を React 状態へ橋渡しするための ref。
  // 初期化 useEffect は一度きり実行のため、最新のトグル関数を ref 経由で参照する。
  const voteToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const toggleVoteModeRef = useRef<() => void>(() => {});
  // タップ時の近接抽出に使う建物一覧の最新値。タップ用 effect を貼り直さずに
  // 参照するため ref に保持する(座標はキャンパス内で安定)。
  const voteBuildingsRef = useRef(voteBuildings);
  // タップ地点に置くマーカー(選択位置の明示)。投票モードを抜けるときに撤去する。
  const tapMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Initialise the map once. The initial center is read from a ref so changing
  // the campus prop animates (flyTo effect) instead of re-creating the map.
  useEffect(() => {
    if (!containerRef.current) return;
    const initial =
      CAMPUSES.find((c) => c.id === campusIdRef.current) ?? CAMPUSES[0];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [initial.center.lng, initial.center.lat],
      zoom: initial.zoom,
      attributionControl: false,
    });
    mapRef.current = map;

    // 現在地の最新測位結果。ドット描画とボタンでの再センタリングで共有する。
    let lastUserLngLat: [number, number] | null = null;
    // アンマウント後に非同期コールバック(Permissions / watch)が削除済みマップを
    // 触らないためのフラグ。クリーンアップで true にする。
    let isCancelled = false;

    // タイル/スタイルの初回読み込み完了。ローディング解除の片方の条件。
    map.on('load', () => setMapLoaded(true));

    // OpenFreeMapのスプライトに無いPOIアイコン(class/subclass名)が要求される
    // たびに警告が出るので、透明1pxを登録して抑止する。該当POIはテキスト
    // ラベルのみで描画される(元の挙動と同じ)。
    map.on('styleimagemissing', (e) => {
      if (!map.hasImage(e.id)) {
        map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
      }
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    // 現在地ドット・現在地ボタンは自前で実装する。MapLibre 既定の GeolocateControl は
    // trackUserLocation:true だと GPS 更新のたびにカメラを現在地へ引き戻して地図操作を
    // 妨げ、false にするとボタンが getCurrentPosition(一度きりの高精度測位)に依存して
    // 端末次第で遅延・失敗し無反応に見える。そこで watchPosition を常時動かして位置だけ
    // を更新し(カメラは動かさない)、ボタンはその最新位置へ一度きり寄せる方式にする。
    const userLocationEl = document.createElement('div');
    userLocationEl.className = 'cmb-user-location';
    const userLocationMarker = new maplibregl.Marker({
      element: userLocationEl,
    });
    let userLocationAdded = false;
    // ボタン押下時にまだ未測位だった場合、初回測位で一度だけ寄せるためのフラグ。
    let centerOnNextFix = false;
    let geoWatchId: number | null = null;

    // MapLibre 既定の現在地ボタンと同じ見た目になるよう、同じクラスを再利用する。
    const geolocateButton = document.createElement('button');
    geolocateButton.type = 'button';
    geolocateButton.className = 'maplibregl-ctrl-geolocate';
    geolocateButton.title = '現在地へ移動';
    geolocateButton.setAttribute('aria-label', '現在地へ移動');
    const geolocateIcon = document.createElement('span');
    geolocateIcon.className = 'maplibregl-ctrl-icon';
    geolocateIcon.setAttribute('aria-hidden', 'true');
    geolocateButton.appendChild(geolocateIcon);

    // 測位待ちの間はボタンを待機表示(MapLibre 標準のスピナー)にし、押しても
    // 反応していないように見えないようにする。
    const setWaiting = (waiting: boolean) => {
      geolocateButton.classList.toggle(
        'maplibregl-ctrl-geolocate-waiting',
        waiting
      );
    };

    const recenterToUser = (lngLat: [number, number]) => {
      map.easeTo({
        center: lngLat,
        zoom: Math.max(map.getZoom(), 16),
        duration: 800,
      });
    };

    const startUserLocationWatch = () => {
      if (isCancelled || geoWatchId !== null || !navigator.geolocation) return;
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (isCancelled) return;
          lastUserLngLat = [pos.coords.longitude, pos.coords.latitude];
          userLocationMarker.setLngLat(lastUserLngLat);
          // 初回測位でマーカーを地図に載せる(以降は位置のみ更新)。
          if (!userLocationAdded) {
            userLocationMarker.addTo(map);
            userLocationAdded = true;
          }
          // ボタンを押した時点で未測位だった場合は、初回測位で一度だけ寄せる。
          if (centerOnNextFix) {
            centerOnNextFix = false;
            setWaiting(false);
            recenterToUser(lastUserLngLat);
          }
        },
        (err) => {
          // ボタン操作に対する測位失敗のときだけ通知する。
          if (centerOnNextFix) {
            centerOnNextFix = false;
            setWaiting(false);
            toast.error(
              '現在地を取得できませんでした。ブラウザの位置情報設定をご確認ください。'
            );
          }
          // 許可拒否は watch が二度と成功・通知しないため、watch を畳んで次回ボタン
          // 押下で再試行(=再通知)できるようにする。一時的なエラーは watch を維持して
          // 回復に任せる。
          if (err.code === err.PERMISSION_DENIED && geoWatchId !== null) {
            navigator.geolocation.clearWatch(geoWatchId);
            geoWatchId = null;
          }
        },
        { enableHighAccuracy: true }
      );
    };

    // 現在地ボタン(自前)。押したときだけ watch の最新位置へ一度きり寄せる(追従しない)。
    // 未測位ならまず watch を開始し(未許可なら許可ダイアログ)、初回測位で寄せる。
    const handleRecenterClick = () => {
      startUserLocationWatch();
      if (lastUserLngLat) {
        recenterToUser(lastUserLngLat);
      } else {
        centerOnNextFix = true;
        setWaiting(true);
      }
    };

    geolocateButton.addEventListener('click', handleRecenterClick);

    const geolocateControl: maplibregl.IControl = {
      onAdd: () => {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        container.appendChild(geolocateButton);
        return container;
      },
      onRemove: () => {
        geolocateButton.removeEventListener('click', handleRecenterClick);
      },
    };
    map.addControl(geolocateControl, 'top-right');

    // 投票モード切替ボタン。現在地ボタンの下(同じ top-right グループ)に並べる。
    // 押下で投票モードのオン/オフを切り替える(実体は React 状態)。
    const voteToggleButton = document.createElement('button');
    voteToggleButton.type = 'button';
    voteToggleButton.className = 'cmb-vote-toggle';
    voteToggleButton.title = '投票モード';
    voteToggleButton.setAttribute(
      'aria-label',
      '設置希望の投票モードを切り替える'
    );
    voteToggleButton.setAttribute('aria-pressed', 'false');
    voteToggleButton.innerHTML = VOTE_TOGGLE_ICON_SVG;
    voteToggleButtonRef.current = voteToggleButton;

    const handleVoteToggleClick = () => toggleVoteModeRef.current();
    voteToggleButton.addEventListener('click', handleVoteToggleClick);

    const voteToggleControl: maplibregl.IControl = {
      onAdd: () => {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        container.appendChild(voteToggleButton);
        return container;
      },
      onRemove: () => {
        voteToggleButton.removeEventListener('click', handleVoteToggleClick);
      },
    };
    map.addControl(voteToggleControl, 'top-right');

    // 位置情報を許可済みのユーザーは、ロード時点から現在地ドットを表示する
    // (カメラは動かさない)。未許可(prompt)の状態では勝手に許可ダイアログを出さない
    // よう、Permissions API で 'granted' を確認できたときだけ watch を開始する。
    // Permissions API 非対応ブラウザ(古い iOS Safari 等)では何もせず、現在地ボタンの
    // 手動操作にフォールバックする。
    map.once('load', () => {
      if (!navigator.permissions?.query) return;
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (status.state === 'granted' && !isCancelled) {
            startUserLocationWatch();
          }
        })
        .catch(() => {
          // 取得失敗時は手動操作に任せる。
        });
    });

    setMapReady(true);

    const markers = markersRef.current;
    return () => {
      // 非同期コールバックが削除済みマップを触らないよう、まず無効化する。
      isCancelled = true;
      if (geoWatchId !== null) {
        navigator.geolocation.clearWatch(geoWatchId);
      }
      userLocationMarker.remove();
      map.remove();
      mapRef.current = null;
      voteToggleButtonRef.current = null;
      markers.clear();
    };
  }, []);

  // サーバー由来の建物に、投票後の最新票数(voteOverrides)を合成した実効リスト。
  // 建物IDはキャンパス内で一意のため、キャンパス切替で残った無関係な override は
  // 単に無視され、prop の state コピー(同期 effect)を不要にできる。
  const effectiveBuildings = useMemo<MapVoteBuilding[]>(
    () =>
      voteBuildings.map((b) =>
        b.buildingId in voteOverrides
          ? { ...b, voteCount: voteOverrides[b.buildingId] }
          : b
      ),
    [voteBuildings, voteOverrides]
  );

  // ボトムシートへ渡す候補。距離は抽出時のスナップショット、票数は実効リストから
  // 都度引くので、投票後も最新票数が反映される。
  const candidates = useMemo<NearbyVoteBuilding[]>(
    () =>
      candidateRefs.flatMap((ref) => {
        const building = effectiveBuildings.find(
          (b) => b.buildingId === ref.buildingId
        );
        return building
          ? [{ ...building, distanceMeters: ref.distanceMeters }]
          : [];
      }),
    [candidateRefs, effectiveBuildings]
  );

  // この操作で投票済みの建物ID(voteOverrides のキー)。ボトムシートで「投票済み」
  // 表示にして再投票を抑止する。
  const votedBuildingIds = useMemo(
    () => new Set(Object.keys(voteOverrides)),
    [voteOverrides]
  );

  // 投票モードの ON/OFF を切り替える。OFF にするときはボトムシートも閉じる。
  const updateVoteMode = (next: boolean) => {
    setVoteMode(next);
    if (!next) setSheetOpen(false);
  };

  // 投票モードのトグル関数を最新の状態で ref に保持する(初期化 useEffect から参照)。
  // effect 本体は ref への代入のみで、setState を同期実行しない。
  useEffect(() => {
    toggleVoteModeRef.current = () => updateVoteMode(!voteMode);
  });

  // 投票モードの状態をトグルボタンの見た目(アクティブ表示)へ反映する。
  useEffect(() => {
    const button = voteToggleButtonRef.current;
    if (!button) return;
    button.classList.toggle('cmb-vote-toggle-active', voteMode);
    button.setAttribute('aria-pressed', voteMode ? 'true' : 'false');
  }, [voteMode]);

  // タップ用 effect から最新の建物一覧を参照できるよう ref を更新する。
  useEffect(() => {
    voteBuildingsRef.current = voteBuildings;
  }, [voteBuildings]);

  // 投票モード中は地図タップで地点を指定する。タップ地点の近接建物を距離順に
  // 抽出してボトムシートを開く。MapLibre の 'click' はドラッグ(パン)中は発火
  // しないため、タップとパンは標準挙動で区別される。ピン(DOMマーカー)上の
  // クリックは map の 'click' を発火しないので、給水機詳細への遷移を妨げない。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !voteMode) return;

    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    canvas.style.cursor = 'crosshair';

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      // タップ地点にマーカーを表示(選択位置の明示)。
      if (!tapMarkerRef.current) {
        tapMarkerRef.current = new maplibregl.Marker({ color: '#1f6fc4' });
      }
      tapMarkerRef.current.setLngLat(e.lngLat).addTo(map);

      const nearby = nearestBuildings(
        { latitude: e.lngLat.lat, longitude: e.lngLat.lng },
        voteBuildingsRef.current,
        NEARBY_LIMIT
      );
      setCandidateRefs(
        nearby.map((b) => ({
          buildingId: b.buildingId,
          distanceMeters: b.distanceMeters,
        }))
      );
      setSheetOpen(true);
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
      canvas.style.cursor = prevCursor;
      tapMarkerRef.current?.remove();
    };
  }, [voteMode, mapReady]);

  // 投票成功時、該当建物の最新票数を記録する(effectiveBuildings 経由で表示更新)。
  const handleVoted = (buildingId: string, voteCount: number) => {
    setVoteOverrides((prev) => ({ ...prev, [buildingId]: voteCount }));
  };

  // Animate to the selected campus on tab change (skip the initial mount).
  useEffect(() => {
    const map = mapRef.current;
    campusIdRef.current = campusId;
    if (!map) return;
    if (isFirstCampusEffect.current) {
      isFirstCampusEffect.current = false;
      return;
    }
    const campus = CAMPUSES.find((c) => c.id === campusId);
    if (!campus) return;
    map.flyTo({
      center: [campus.center.lng, campus.center.lat],
      zoom: campus.zoom,
      duration: 1200,
    });
  }, [campusId]);

  // Sync markers to the current stations (skip stations without coordinates).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;

    const valid = stations.flatMap((station) =>
      station.latitude != null && station.longitude != null
        ? [{ station, lng: station.longitude, lat: station.latitude }]
        : []
    );
    const validIds = new Set(valid.map((v) => v.station.id));

    for (const [id, marker] of markers) {
      if (!validIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }

    const nextPins: { station: StationWithRelations; el: HTMLElement }[] = [];
    for (const { station, lng, lat } of valid) {
      let marker = markers.get(station.id);
      if (!marker) {
        const el = document.createElement('div');
        marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map);
        markers.set(station.id, marker);
      } else {
        marker.setLngLat([lng, lat]);
      }
      nextPins.push({ station, el: marker.getElement() });
    }
    setPins(nextPins);
    setPinsReady(true);
  }, [stations, mapReady]);

  const loading = !(mapLoaded && pinsReady);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {pins.map(({ station, el }) =>
        createPortal(
          <StationPin station={station} onClick={onStationClick} />,
          el,
          station.id
        )
      )}
      {/* 投票モードの案内バナー。地図タップで地点を指定する。地図操作(パン/ズーム)は
          妨げないよう、バナーのみを上部に重ねる。 */}
      {voteMode && (
        <div className="absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-3">
          <div
            role="status"
            className="flex items-center gap-2 rounded-full border border-[#1f6fc4]/20 bg-white/90 px-4 py-2 text-sm font-medium text-[#23566e] shadow-md backdrop-blur"
          >
            地図をタップして投票する場所を選んでください
            <button
              type="button"
              onClick={() => updateVoteMode(false)}
              aria-label="投票モードを終了"
              className="-mr-1 ml-1 flex size-6 items-center justify-center rounded-full text-[#5a6b6a] transition-colors hover:bg-muted"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <NearbyBuildingsDrawer
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        candidates={candidates}
        onVoted={handleVoted}
        votedBuildingIds={votedBuildingIds}
      />

      {/* 地図タイルとピンの両方が揃うまでオーバーレイで覆う。 */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <Spinner className="size-8 text-[#0f897f]" />
        </div>
      )}
    </div>
  );
}
