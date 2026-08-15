/* Charging Yield Explorer — static port (HTML / CSS / Vanilla JS / native SVG) */
(function () {
  'use strict';

  /* ============================================================
   * 1. Constants / Configuration
   * ========================================================== */

  const J_BASE = { selection: 80, availability: 90, start: 95, session: 95, repeat: 70 };
  const E_BASE = { utilization: 0, availability: 0, price: 0, electricity: 0, sitecost: 0, investment: 0 };

  const J_ORDER = ['demand', 'selection', 'availability', 'start', 'session', 'repeat'];

  const J_LABELS = {
    demand: '수요 · Demand',
    selection: '선택 · Selection',
    availability: '가용성 · Availability',
    start: '충전 시작 · Start',
    session: '충전 세션 · Session',
    repeat: '재이용 · Repeat'
  };

  const J_STAGE_DEFS = [
    { key: 'selection', label: '선택 · Selection', min: 50, max: 100, step: 1, num: 2 },
    { key: 'availability', label: '가용성 · Availability', min: 50, max: 100, step: 1, num: 3 },
    { key: 'start', label: '충전 시작 · Start', min: 50, max: 100, step: 1, num: 4 },
    { key: 'session', label: '충전 세션 · Session', min: 50, max: 100, step: 1, num: 5 },
    { key: 'repeat', label: '재이용 · Repeat', min: 20, max: 100, step: 1, num: 6 }
  ];

  const ICONS = {
    availability: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    start: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/></svg>',
    session: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12h4l2 8 4-16 2 8h6"/></svg>'
  };

  const DIAG_DEFS = [
    {
      key: 'availability',
      title: '가용성 · Availability',
      color: 'var(--diag-availability)',
      bg: 'var(--diag-availability-bg)',
      border: 'var(--diag-availability-border)',
      icon: ICONS.availability,
      items: ['Fault Rate', 'Offline Rate', 'Occupancy Rate', 'Maintenance Time']
    },
    {
      key: 'start',
      title: '충전 시작 · Start',
      color: 'var(--diag-start)',
      bg: 'var(--diag-start-bg)',
      border: 'var(--diag-start-border)',
      icon: ICONS.start,
      items: ['Authentication', 'Payment', 'Compatibility', 'PnC (Plug & Charge)', 'Fallback']
    },
    {
      key: 'session',
      title: '충전 세션 · Session',
      color: 'var(--diag-session)',
      bg: 'var(--diag-session-bg)',
      border: 'var(--diag-session-border)',
      icon: ICONS.session,
      items: ['Abnormal Termination', 'Communication Failure', 'Charger Error', 'Vehicle Error']
    }
  ];

  const STAGE_CONTENT = {
    availability: {
      context: '가용성',
      infer: '가용성 구간에서 상대적인 이탈이 발생했습니다',
      validate: '실제 원인과 개선 우선순위는 충전기별 장애·오프라인 데이터 확인이 필요합니다.',
      evidence: ['Charger Status', 'Offline Duration', 'Fault Code', 'Maintenance History']
    },
    start: {
      context: '충전 시작 실패',
      infer: '충전 시작 구간에서 상대적인 이탈이 확대되었습니다',
      validate: '실제 원인과 개선 우선순위는 인증·결제·차량 조합별 실패 데이터 확인이 필요합니다.',
      evidence: ['Failure Code', 'Authentication Type', 'Payment Result', 'Vehicle × Charger Model', 'Retry / Fallback Result']
    },
    session: {
      context: '충전 세션 실패',
      infer: '충전 세션 구간에서 상대적인 이탈이 발생했습니다',
      validate: '실제 원인과 개선 우선순위는 통신·차량·충전기 조합별 세션 데이터 확인이 필요합니다.',
      evidence: ['Abnormal Termination Reason', 'Charger Model', 'Vehicle Type', 'Communication Context']
    }
  };

  const RECOVERY_CHECKS = ['Retry Success', 'Remote Recovery', 'MTTR', 'Repeat Failure', 'VOC / Sessions'];
  const RECOVERY_EVIDENCE = ['Retry Result', 'Fallback Result', 'Remote Recovery Result', 'MTTR', 'Repeat Failure'];

  const DRIVERS = [
    { key: 'utilization', label: '이용률', unit: '%p', min: -10, max: 10, step: 2, range: 10, dir: 1 },
    { key: 'availability', label: '가용률', unit: '%p', min: -5, max: 5, step: 1, range: 5, dir: 1 },
    { key: 'price', label: '충전요금', unit: '%', min: -10, max: 10, step: 2, range: 10, dir: 1 },
    { key: 'electricity', label: '전력원가', unit: '%', min: -20, max: 20, step: 4, range: 20, dir: -1 },
    { key: 'sitecost', label: '충전소 비용', unit: '%', min: -20, max: 20, step: 4, range: 20, dir: -1 },
    { key: 'investment', label: '투자부담', unit: '%', min: -20, max: 20, step: 4, range: 20, dir: -1 }
  ];

  const PRESET_DEFS = [
    { key: 'avail', label: 'Availability Stress', display: '가용성 저하', tab: 'journey' },
    { key: 'start', label: 'Activation Failure Stress', display: '충전 시작 실패 · Activation Failure', tag: '추천 시나리오', tab: 'journey' },
    { key: 'op', label: 'Operation Improve', display: '운영 개선 · Operation Improve', tab: 'econ' }
  ];

  /**
   * Illustrative measurement contracts for this working model. Only the four
   * representative metrics below are defined; every other diagnostic item stays
   * a plain text row.
   */
  const MEASUREMENT_CONTRACTS = {
    faultRate: {
      area: '가용성',
      item: 'Fault Rate',
      title: '장애율 · Fault Rate',
      type: '비율 / 진단 지표',
      definition: '충전기 또는 충전 세션 관찰 대상 중 Fault 상태가 확인된 비율을 탐색하기 위한 지표입니다.',
      purpose: '가용성 이탈이 충전기 장애와 연결되는지 추가로 확인하기 위한 신호입니다.',
      signals: ['Charger Status', 'Fault Code', 'Timestamp'],
      numerator: '정의된 Fault 상태로 분류된 Observation',
      denominator: '정의된 전체 Eligible Observation',
      calculation: 'Fault Observations ÷ Eligible Observations × 100',
      interpretation: '값이 높을수록 가용성 저하와 충전기 장애 간 관계를 추가로 확인할 필요가 있음을 의미합니다.',
      validation: '실제 Event Schema, Fault 상태 정의, Observation Unit, Denominator 기준은 내부 데이터 및 운영 기준 확인이 필요합니다.'
    },
    authentication: {
      area: '충전 시작',
      item: 'Authentication',
      title: '인증 실패율 · Authentication Failure Rate',
      type: '비율 / 충전 시작 진단 지표',
      definition: '충전 시작 과정에서 인증 절차가 실패한 비율을 탐색하기 위한 지표입니다.',
      purpose: '충전 시작 이탈이 인증 과정의 실패와 연결되는지 확인합니다.',
      signals: ['Authentication Attempt', 'Authentication Result', 'Authentication Type', 'Timestamp'],
      numerator: 'Authentication Failure Attempts',
      denominator: 'Eligible Authentication Attempts',
      calculation: 'Authentication Failure Attempts ÷ Eligible Authentication Attempts × 100',
      interpretation: '값이 높을수록 충전 시작 실패 중 인증 과정의 영향 여부를 추가로 확인할 필요가 있습니다.',
      validation: '실제 인증 유형, 실패 상태 정의, 중복 Retry 처리 기준, Eligible Attempt 기준은 내부 Event Schema 확인이 필요합니다.'
    },
    abnormalTermination: {
      area: '충전 세션',
      item: 'Abnormal Termination',
      title: '비정상 종료율 · Abnormal Termination Rate',
      type: '비율 / 충전 세션 진단 지표',
      definition: '시작된 충전 세션 중 정상 완료 상태에 도달하지 못하고 비정상 종료된 세션 비율입니다.',
      purpose: '충전 세션 이탈이 비정상 종료와 연결되는지 확인합니다.',
      signals: ['Session Start', 'Session End', 'End Reason', 'Charger Status', 'Communication Context'],
      numerator: 'Abnormally Terminated Sessions',
      denominator: 'Eligible Started Sessions',
      calculation: 'Abnormally Terminated Sessions ÷ Eligible Started Sessions × 100',
      interpretation: '값이 높을수록 세션 완료 저하와 비정상 종료 간 관계를 추가로 분석할 필요가 있습니다.',
      validation: '실제 정상/비정상 종료 상태 정의와 사용자 정상 중단, 차량 종료, 충전기 오류, 통신 종료 등의 Classification은 운영·Event 기준 확인이 필요합니다.'
    },
    retrySuccess: {
      area: '복구',
      item: 'Retry Success',
      title: '재시도 성공률 · Retry Success Rate',
      type: '비율 / 복구 지표',
      definition: '최초 Failure 이후 수행된 Retry 중 정상 Recovery State에 도달한 비율입니다.',
      purpose: '실패 발생 이후 재시도가 실제 복구에 기여하는지 확인합니다.',
      signals: ['Failure Event', 'Retry Attempt', 'Retry Result', 'Final State', 'Timestamp'],
      numerator: 'Successful Recovery after Retry',
      denominator: 'Eligible Retry Attempts',
      calculation: 'Successful Retry Recoveries ÷ Eligible Retry Attempts × 100',
      interpretation: '재시도 성공률은 현재 복구 흐름의 효과를 탐색하기 위한 신호입니다.',
      validation: 'Retry 정의, 자동 Retry와 사용자 Retry 구분, 중복 Retry, Success State, 최종 Recovery State는 실제 운영 정책 확인이 필요합니다.'
    }
  };

  /** Diagnostic / recovery item label → contract key. */
  const CONTRACT_BY_ITEM = {
    'Fault Rate': 'faultRate',
    'Authentication': 'authentication',
    'Abnormal Termination': 'abnormalTermination',
    'Retry Success': 'retrySuccess'
  };

  const CONTRACT_NOT_DEFINED_HINT = '이 예시 모델에는 지표 정의 기준이 없습니다';

  /** Display-only labels. Internal item strings stay the CONTRACT_BY_ITEM keys. */
  const ITEM_DISPLAY = {
    'Fault Rate': '장애율 · Fault Rate',
    'Offline Rate': '오프라인율 · Offline Rate',
    'Occupancy Rate': '점유율 · Occupancy Rate',
    'Maintenance Time': '정비 시간 · Maintenance Time',
    'Authentication': '인증 실패',
    'Payment': '결제 실패',
    'Compatibility': '호환 실패',
    'PnC (Plug & Charge)': 'PnC (Plug & Charge)',
    'Fallback': '대체 경로 · Fallback',
    'Abnormal Termination': '비정상 종료 · Abnormal Termination',
    'Communication Failure': '통신 실패',
    'Charger Error': '충전기 오류',
    'Vehicle Error': '차량 오류',
    'Retry Success': '재시도 성공률 · Retry Success',
    'Remote Recovery': '원격 복구율 · Remote Recovery',
    'Repeat Failure': '재발률',
    'VOC / Sessions': '세션당 VOC · VOC / Sessions'
  };

  function itemDisplay(label) {
    return ITEM_DISPLAY[label] || label;
  }

  function presetDisplay(internalLabel) {
    for (let i = 0; i < PRESET_DEFS.length; i++) {
      if (PRESET_DEFS[i].label === internalLabel) return PRESET_DEFS[i].display;
    }
    return internalLabel;
  }

  /**
   * Analytics is a side-effect layer. Fixed enumerations only — never DOM text,
   * never PII. GTM routes these dataLayer events; this file does not call gtag.
   */
  const ANALYTICS = {
    tabName: { journey: 'journey', econ: 'economics' },
    presets: {
      avail: { tab_name: 'journey', preset_name: 'availability_stress' },
      start: { tab_name: 'journey', preset_name: 'activation_failure_stress' },
      op: { tab_name: 'economics', preset_name: 'operation_improve' }
    },
    contracts: {
      faultRate: { metric_name: 'fault_rate', diagnostic_area: 'availability' },
      authentication: { metric_name: 'authentication_failure_rate', diagnostic_area: 'start' },
      abnormalTermination: { metric_name: 'abnormal_termination_rate', diagnostic_area: 'session' },
      retrySuccess: { metric_name: 'retry_success_rate', diagnostic_area: 'recovery' }
    },
    econControls: {
      utilization: { control_name: 'utilization', value_unit: 'percentage_point' },
      availability: { control_name: 'availability', value_unit: 'percentage_point' },
      price: { control_name: 'charging_price', value_unit: 'percent' },
      electricity: { control_name: 'electricity_cost', value_unit: 'percent' },
      sitecost: { control_name: 'site_cost', value_unit: 'percent' },
      investment: { control_name: 'investment_burden', value_unit: 'percent' }
    }
  };

  function trackEvent(eventName, parameters) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: eventName }, parameters || {}));
    } catch (error) {
      /* Analytics failure must never affect product functionality. */
    }
  }

  /** Sections are skipped when the contract has no value for them. */
  const CONTRACT_SECTIONS = [
    { key: 'definition', label: '정의' },
    { key: 'purpose', label: '왜 보는가' },
    { key: 'signals', label: '측정 신호', kind: 'chips' },
    { key: 'numerator', label: '분자 · Numerator' },
    { key: 'denominator', label: '분모 · Denominator' },
    { key: 'calculation', label: '계산식', kind: 'formula' },
    { key: 'interpretation', label: '해석' },
    { key: 'validation', label: '실제 적용 전 확인', kind: 'muted' }
  ];

  /** Shared horizontal inset so edge stage labels and value texts stay inside the plot. */
  const FUNNEL_PAD_X = 24;

  /* Index scale of the waterfall plot area — unchanged design contract. */
  const WF_SCALE_MIN = 70;
  const WF_SCALE_MAX = 130;
  const WF_PLOT_H = 200;
  const WF_GRID_VALUES = [130, 115, 100, 85, 70];
  const WF_SLOTS = DRIVERS.length + 2;
  const WF_BAR_RATIO = 0.55;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  /**
   * Both charts draw in 1:1 user units against the measured container box, so
   * the viewBox never stretches shapes or text. Values are the CSS fallbacks
   * used until the first measurement lands.
   */
  const chartBox = {
    funnel: { w: 600, h: 210 },
    waterfall: { w: 700, h: 220 }
  };

  /* ============================================================
   * 2. Application State
   * ========================================================== */

  const state = {
    activeTab: 'journey',
    journey: {
      vals: Object.assign({}, J_BASE),
      selectedStage: null,
      preset: null,
      infoOpen: false
    },
    economics: {
      vals: Object.assign({}, E_BASE),
      preset: null,
      infoOpen: false
    },
    contractKey: null,
    contractTrigger: null
  };

  /* ============================================================
   * 3. Calculation Functions
   * ========================================================== */

  /** Cumulative Demand Index per stage (float; Demand = 100). */
  function journeyIndex(vals) {
    const idx = { demand: 100 };
    let prev = 100;
    for (let i = 1; i < J_ORDER.length; i++) {
      const key = J_ORDER[i];
      prev = prev * (vals[key] / 100);
      idx[key] = prev;
    }
    return idx;
  }

  function calculateJourney() {
    const vals = state.journey.vals;
    const idx = journeyIndex(vals);
    const baseIdx = journeyIndex(J_BASE);

    const leak = {};
    for (let i = 1; i < J_ORDER.length; i++) {
      const key = J_ORDER[i];
      leak[key] = idx[J_ORDER[i - 1]] - idx[key];
    }

    let largestKey = null;
    let largestVal = -1;
    for (let i = 1; i < J_ORDER.length; i++) {
      const key = J_ORDER[i];
      if (leak[key] > largestVal) {
        largestVal = leak[key];
        largestKey = key;
      }
    }

    const modified = J_STAGE_DEFS.some((s) => vals[s.key] !== J_BASE[s.key]);
    const sessionChangePct = Math.round((idx.session / baseIdx.session - 1) * 100);

    return {
      idx: idx,
      leak: leak,
      largestKey: largestKey,
      largestVal: largestVal,
      modified: modified,
      stateLabel: state.journey.preset
        ? ('예시 프리셋 · ' + presetDisplay(state.journey.preset))
        : (modified ? '시나리오 변경됨' : '기준 시나리오'),
      sessionChangePct: sessionChangePct,
      e2e: Math.round(idx.repeat)
    };
  }

  function calculateEconomics() {
    const vals = state.economics.vals;
    const impacts = {};
    DRIVERS.forEach((d) => {
      impacts[d.key] = Math.round(d.dir * (vals[d.key] / d.range) * 5 * 10) / 10;
    });

    const sum = DRIVERS.reduce((acc, d) => acc + impacts[d.key], 0);
    const index = Math.round((100 + sum) * 10) / 10;
    const modified = DRIVERS.some((d) => vals[d.key] !== 0);
    const netZero = modified && index === 100;

    let stateLabel;
    if (state.economics.preset) stateLabel = '예시 프리셋 · ' + presetDisplay(state.economics.preset);
    else if (!modified) stateLabel = '기준 시나리오';
    else stateLabel = netZero ? '시나리오 변경됨 · 순효과 0' : '시나리오 변경됨';

    const ranked = DRIVERS
      .filter((d) => impacts[d.key] !== 0)
      .slice()
      .sort((a, b) => Math.abs(impacts[b.key]) - Math.abs(impacts[a.key]));

    return {
      impacts: impacts,
      sum: sum,
      index: index,
      modified: modified,
      netZero: netZero,
      stateLabel: stateLabel,
      ranked: ranked,
      interpretation: interpretEconomics(impacts, sum, index, modified, netZero)
    };
  }

  function shortDriverLabel(driver) {
    return driver.label.split(' · ')[1] || driver.label;
  }

  /** Conjunction particle for the item that precedes 와/과 in a driver list. */
  const KO_CONJUNCTION = {
    '이용률': '과',
    '가용률': '과',
    '충전요금': '과',
    '전력원가': '와',
    '충전소 비용': '과',
    '투자부담': '과'
  };

  /** 로 / 으로 depends on whether the spoken last digit ends in a consonant. */
  function indexParticle(value) {
    return [0, 3, 6].indexOf(Math.abs(value) % 10) !== -1 ? '으로' : '로';
  }

  function joinDriverNames(names) {
    if (names.length <= 1) return names[0] || '';
    const head = names.slice(0, -1);
    const linkWord = head[head.length - 1];
    return head.join(', ') + (KO_CONJUNCTION[linkWord] || '와') + ' ' + names[names.length - 1];
  }

  function interpretEconomics(impacts, sum, index, modified, netZero) {
    if (!modified) return '현재 시나리오는 기준 시나리오와 동일합니다.';
    if (netZero) return '긍정적 영향과 부정적 영향이 서로 상쇄되어 상대 경제성 지수는 기준 100을 유지합니다.';

    const posNames = DRIVERS.filter((d) => impacts[d.key] > 0).map(shortDriverLabel);
    const negNames = DRIVERS.filter((d) => impacts[d.key] < 0).map(shortDriverLabel);
    const pos = joinDriverNames(posNames) + '의 긍정적 영향';
    const neg = joinDriverNames(negNames) + '의 부정적 영향';
    const move = '상대 경제성 지수는 기준 100에서 ' + index + indexParticle(index) + ' 변화했습니다.';

    if (!negNames.length) return '현재 시나리오에서는 ' + pos + '으로 ' + move;
    if (!posNames.length) return '현재 시나리오에서는 ' + neg + '으로 ' + move;
    if (sum > 0) return '현재 시나리오에서는 ' + pos + '이 ' + neg + '보다 크게 나타납니다. ' + move;
    return '현재 시나리오에서는 ' + neg + '이 ' + pos + '보다 크게 나타납니다. ' + move;
  }

  /**
   * Single source of truth for the funnel x-axis. Stage nodes, stage labels,
   * chart points, value labels, guide lines and leakage labels all read from
   * this array, so no element can use a competing layout rule.
   */
  function stageXPositions(width, count) {
    const inset = Math.min(FUNNEL_PAD_X, width / (count * 2));
    const usable = Math.max(1, width - inset * 2);
    const xs = [];
    for (let i = 0; i < count; i++) xs.push(inset + (i / (count - 1)) * usable);
    return xs;
  }

  /** Midpoints between neighbouring stages — used by chevrons and leakage labels. */
  function segmentXPositions(xs) {
    const mids = [];
    for (let i = 1; i < xs.length; i++) mids.push((xs[i - 1] + xs[i]) / 2);
    return mids;
  }

  function funnelPoints(idx, xs, height) {
    return J_ORDER.map((key, i) => {
      const value = Math.max(0, Math.min(100, idx[key]));
      return {
        key: key,
        x: xs[i],
        y: height - (value / 100) * height
      };
    });
  }

  function waterfallY(value) {
    return WF_PLOT_H - ((value - WF_SCALE_MIN) / (WF_SCALE_MAX - WF_SCALE_MIN)) * WF_PLOT_H;
  }

  /** Bar slots are re-laid-out across the measured chart width; bar height stays on the index scale. */
  function waterfallBars(impacts, index, width) {
    const bars = [];
    const slotW = width / WF_SLOTS;
    const barW = slotW * WF_BAR_RATIO;
    const baseSlotX = slotW * 0.5;

    bars.push({
      x: baseSlotX - barW / 2,
      y: waterfallY(100),
      w: barW,
      h: Math.max(2, WF_PLOT_H - waterfallY(100)),
      fill: 'var(--neutral-bar)',
      labelX: baseSlotX,
      labelY: waterfallY(100) - 8,
      labelColor: 'var(--text-secondary)',
      labelText: '100'
    });

    let running = 100;
    DRIVERS.forEach((d, i) => {
      const v = impacts[d.key];
      const from = running;
      const to = running + v;
      running = to;
      const top = Math.max(from, to);
      const bottom = Math.min(from, to);
      const slotX = slotW * (i + 1.5);
      const color = v > 0 ? 'var(--positive)' : (v < 0 ? 'var(--negative)' : 'var(--text-faint)');
      bars.push({
        x: slotX - barW / 2,
        y: waterfallY(top),
        w: barW,
        h: Math.max(2, waterfallY(bottom) - waterfallY(top)),
        fill: color,
        labelX: slotX,
        labelY: v >= 0 ? waterfallY(top) - 8 : waterfallY(bottom) + 18,
        labelColor: color,
        labelText: (v > 0 ? '+' : '') + v
      });
    });

    const finalSlotX = slotW * (WF_SLOTS - 0.5);
    bars.push({
      x: finalSlotX - barW / 2,
      y: waterfallY(index),
      w: barW,
      h: Math.max(2, WF_PLOT_H - waterfallY(index)),
      fill: 'var(--brand-primary)',
      labelX: finalSlotX,
      labelY: waterfallY(index) - 8,
      labelColor: 'var(--text-primary)',
      labelText: String(index)
    });

    return bars;
  }

  /* ============================================================
   * 4. DOM References
   * ========================================================== */

  const $ = (id) => document.getElementById(id);

  const dom = {
    tabButtons: Array.from(document.querySelectorAll('.tab-button')),
    panelJourney: $('panel-journey'),
    panelEcon: $('panel-econ'),
    jPresetButtons: $('jPresetButtons'),
    ePresetButtons: $('ePresetButtons'),

    contractDialog: $('contractDialog'),
    contractTitle: $('contractTitle'),
    contractMeta: $('contractMeta'),
    contractBody: $('contractBody'),
    contractSections: $('contractSections'),
    contractClose: $('contractClose'),

    jStateLabel: $('jStateLabel'),
    jSliderRows: $('jSliderRows'),
    jReset: $('jReset'),
    jFunnelNodes: $('jFunnelNodes'),
    jFunnelLabels: $('jFunnelLabels'),
    jFunnelBox: $('jFunnelBox'),
    jFunnelSvg: $('jFunnelSvg'),
    jAreaPath: $('jAreaPath'),
    jLinePath: $('jLinePath'),
    jFunnelMarks: $('jFunnelMarks'),
    jLossItems: $('jLossItems'),
    jLargest: $('jLargest'),
    jSessionChange: $('jSessionChange'),
    jE2E: $('jE2E'),
    jDecisionBoundary: $('jDecisionBoundary'),
    jContext: $('jContext'),
    jInfer: $('jInfer'),
    jValidate: $('jValidate'),
    jEvidence: $('jEvidence'),
    recoveryChecks: $('recoveryChecks'),
    recoveryEvidence: $('recoveryEvidence'),
    jInfoToggle: $('jInfoToggle'),
    jInfoBody: $('jInfoBody'),
    diagCards: $('diagCards'),
    diagEmpty: $('diagEmpty'),

    eStateBadge: $('eStateBadge'),
    eSliderRows: $('eSliderRows'),
    eReset: $('eReset'),
    eIndex: $('eIndex'),
    eStateLabel: $('eStateLabel'),
    eGridLines: $('eGridLines'),
    eWaterfallBars: $('eWaterfallBars'),
    eWaterfallLabels: $('eWaterfallLabels'),
    eWaterfallBox: $('eWaterfallBox'),
    eWaterfallSvg: $('eWaterfallSvg'),
    eInterp: $('eInterp'),
    eInfoToggle: $('eInfoToggle'),
    eInfoBody: $('eInfoBody'),
    eRankList: $('eRankList'),
    eRankEmpty: $('eRankEmpty')
  };

  /* Nodes created once and updated in place. */
  const refs = {
    presets: [],
    jSliders: [],
    jNodes: [],
    jLabels: [],
    jChevrons: [],
    jLoss: [],
    jMarks: [],
    diagCards: [],
    contractTriggers: [],
    eSliders: [],
    wfGridLines: [],
    wfBars: []
  };

  /**
   * Reads the live pixel box of both chart containers. Returns true when a
   * dimension actually moved, so resize callbacks can skip redundant renders.
   */
  function syncChartBoxes() {
    let changed = false;
    [['funnel', dom.jFunnelBox], ['waterfall', dom.eWaterfallBox]].forEach(([key, box]) => {
      const rect = box.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const measured = chartBox[key];
      if (Math.abs(measured.w - rect.width) >= 0.5 || Math.abs(measured.h - rect.height) >= 0.5) {
        measured.w = rect.width;
        measured.h = rect.height;
        changed = true;
      }
    });
    return changed;
  }

  /* ============================================================
   * 5. Static DOM construction
   * ========================================================== */

  function svgEl(name, attrs) {
    const el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
    return el;
  }

  /**
   * WebKit has no ::-moz-range-progress equivalent, so the filled share of the
   * track is handed to CSS as a percentage. Presentation only.
   */
  function setSliderFill(input, value, min, max) {
    const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty('--fill', pct.toFixed(2) + '%');
  }

  function chip(text) {
    const span = document.createElement('span');
    span.className = 'chip';
    span.textContent = text;
    return span;
  }

  function fillChips(container, values) {
    container.textContent = '';
    values.forEach((v) => container.appendChild(chip(itemDisplay(v))));
  }

  /** Chip list where labels with a measurement contract become buttons. */
  function fillContractAwareChips(container, values) {
    container.textContent = '';
    values.forEach((label) => {
      const key = CONTRACT_BY_ITEM[label];
      if (!key) {
        const span = chip(itemDisplay(label));
        span.title = CONTRACT_NOT_DEFINED_HINT;
        container.appendChild(span);
        return;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = itemDisplay(label);
      btn.title = '지표 정의 기준 보기';
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.addEventListener('click', () => openContract(key, btn));
      container.appendChild(btn);
      refs.contractTriggers.push({ key: key, el: btn });
    });
  }

  function buildPresets() {
    const containers = { journey: dom.jPresetButtons, econ: dom.ePresetButtons };
    PRESET_DEFS.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-button';
      btn.appendChild(document.createTextNode(p.display));
      if (p.tag) {
        const tag = document.createElement('span');
        tag.className = 'preset-button__tag';
        tag.textContent = p.tag;
        btn.appendChild(tag);
      }
      btn.addEventListener('click', () => applyPreset(p.key));
      containers[p.tab].appendChild(btn);
      refs.presets.push({ def: p, el: btn });
    });
  }

  function buildJourneySliders() {
    J_STAGE_DEFS.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'slider-row';

      const head = document.createElement('div');
      head.className = 'slider-row__head';

      const num = document.createElement('span');
      num.className = 'slider-row__num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = s.num;

      const label = document.createElement('label');
      label.className = 'slider-row__label';
      label.setAttribute('for', 'j-' + s.key);
      label.textContent = s.label;

      const value = document.createElement('span');
      value.className = 'slider-row__value';

      head.append(num, label, value);

      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'slider';
      input.id = 'j-' + s.key;
      input.min = s.min;
      input.max = s.max;
      input.step = s.step;
      input.value = state.journey.vals[s.key];
      input.addEventListener('input', (e) => setJourneyVal(s.key, parseInt(e.target.value, 10)));
      input.addEventListener('change', (e) => {
        trackEvent('slider_change', {
          tab_name: 'journey',
          control_name: s.key,
          control_value: parseInt(e.target.value, 10),
          value_unit: 'percent'
        });
      });

      const foot = document.createElement('div');
      foot.className = 'slider-row__foot';
      const footLabel = document.createElement('span');
      footLabel.textContent = '누적 수요 지수';
      const idxOut = document.createElement('span');
      idxOut.className = 'slider-row__idx';
      foot.append(footLabel, idxOut);

      row.append(head, input, foot);
      dom.jSliderRows.appendChild(row);
      refs.jSliders.push({ def: s, input: input, value: value, idx: idxOut });
    });
  }

  function buildFunnelStatic() {
    J_ORDER.forEach((key, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'funnel__node';
      btn.textContent = i + 1;
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', J_LABELS[key] + ' 단계 선택');
      btn.addEventListener('click', () => selectStage(key));
      dom.jFunnelNodes.appendChild(btn);
      refs.jNodes.push(btn);

      if (i < J_ORDER.length - 1) {
        const chev = document.createElement('span');
        chev.className = 'funnel__chevron';
        chev.setAttribute('aria-hidden', 'true');
        chev.textContent = '»';
        dom.jFunnelNodes.appendChild(chev);
        refs.jChevrons.push(chev);
      }

      const label = document.createElement('div');
      label.className = 'funnel__label';
      label.textContent = J_LABELS[key];
      dom.jFunnelLabels.appendChild(label);
      refs.jLabels.push(label);

      const line = svgEl('line', {
        stroke: 'var(--funnel-dash)',
        'stroke-dasharray': '2,3'
      });
      const circle = svgEl('circle', {
        r: 4,
        fill: 'var(--bg-primary)',
        stroke: 'var(--brand-line)',
        'stroke-width': 2
      });
      const text = svgEl('text', {
        'text-anchor': 'middle',
        'font-size': 15,
        'font-weight': 700
      });
      dom.jFunnelMarks.append(line, circle, text);
      refs.jMarks.push({ line: line, circle: circle, text: text });
    });

    J_ORDER.slice(1).forEach(() => {
      const cell = document.createElement('div');
      cell.className = 'funnel__loss-item';
      dom.jLossItems.appendChild(cell);
      refs.jLoss.push(cell);
    });
  }

  function buildDiagCards() {
    DIAG_DEFS.forEach((d) => {
      const card = document.createElement('div');
      card.className = 'diagnostic-card';
      card.style.setProperty('--stage-color', d.color);
      card.style.setProperty('--stage-bg', d.bg);
      card.style.setProperty('--stage-border', d.border);

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'diagnostic-card__head';
      head.setAttribute('aria-pressed', 'false');
      head.setAttribute('aria-label', d.title + ' 단계 선택');

      const icon = document.createElement('span');
      icon.className = 'diagnostic-card__icon';
      icon.innerHTML = d.icon;

      const title = document.createElement('span');
      title.className = 'diagnostic-card__title';
      title.textContent = d.title;

      head.append(icon, title);
      head.addEventListener('click', () => selectStage(d.key));
      card.appendChild(head);

      d.items.forEach((label) => {
        const contractKey = CONTRACT_BY_ITEM[label];
        if (!contractKey) {
          const item = document.createElement('div');
          item.className = 'diagnostic-card__item';
          item.textContent = itemDisplay(label);
          item.title = CONTRACT_NOT_DEFINED_HINT;
          card.appendChild(item);
          return;
        }
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'diagnostic-card__item';
        item.textContent = itemDisplay(label);
        item.title = '지표 정의 기준 보기';
        item.setAttribute('aria-haspopup', 'dialog');
        /* Opening a contract must never change the Journey stage context. */
        item.addEventListener('click', (event) => {
          event.stopPropagation();
          openContract(contractKey, item);
        });
        card.appendChild(item);
        refs.contractTriggers.push({ key: contractKey, el: item });
      });

      /* Clicking the card outside any inner control selects the stage. */
      card.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        selectStage(d.key);
      });

      dom.diagCards.appendChild(card);
      refs.diagCards.push({ def: d, el: card, head: head });
    });
  }

  function buildEconomicsSliders() {
    DRIVERS.forEach((d) => {
      const row = document.createElement('div');
      row.className = 'slider-row';

      const head = document.createElement('div');
      head.className = 'slider-row__head slider-row__head--between';

      const label = document.createElement('label');
      label.className = 'slider-row__label slider-row__label--econ';
      label.setAttribute('for', 'e-' + d.key);
      label.textContent = d.label;

      const value = document.createElement('span');
      value.className = 'slider-row__value slider-row__value--econ';

      head.append(label, value);

      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'slider slider--econ';
      input.id = 'e-' + d.key;
      input.min = d.min;
      input.max = d.max;
      input.step = d.step;
      input.value = state.economics.vals[d.key];
      input.addEventListener('input', (e) => setEconomicsVal(d.key, parseInt(e.target.value, 10)));
      input.addEventListener('change', (e) => {
        const meta = ANALYTICS.econControls[d.key];
        if (!meta) return;
        trackEvent('slider_change', {
          tab_name: 'economics',
          control_name: meta.control_name,
          control_value: parseInt(e.target.value, 10),
          value_unit: meta.value_unit
        });
      });

      const foot = document.createElement('div');
      foot.className = 'slider-row__foot';
      const minLabel = document.createElement('span');
      minLabel.textContent = d.min + d.unit;
      const maxLabel = document.createElement('span');
      maxLabel.textContent = d.max + d.unit;
      foot.append(minLabel, maxLabel);

      row.append(head, input, foot);
      dom.eSliderRows.appendChild(row);
      refs.eSliders.push({ def: d, input: input, value: value });
    });
  }

  function buildWaterfallStatic() {
    WF_GRID_VALUES.forEach((v) => {
      const y = waterfallY(v).toFixed(1);
      const line = svgEl('line', {
        x1: 0, y1: y, y2: y,
        stroke: 'var(--grid-line)',
        'stroke-dasharray': '2,4'
      });
      dom.eGridLines.appendChild(line);
      refs.wfGridLines.push(line);

      const text = svgEl('text', {
        x: 0,
        y: (waterfallY(v) + 4).toFixed(1),
        fill: 'var(--text-faint)',
        'font-size': 10
      });
      text.textContent = v;
      dom.eGridLines.appendChild(text);
    });

    for (let i = 0; i < WF_SLOTS; i++) {
      const rect = svgEl('rect', { rx: 3 });
      const text = svgEl('text', {
        'text-anchor': 'middle',
        'font-size': 12.5,
        'font-weight': 700
      });
      dom.eWaterfallBars.append(rect, text);
      refs.wfBars.push({ rect: rect, text: text });
    }

    const labels = ['기준 100'].concat(DRIVERS.map(shortDriverLabel)).concat(['현재 지수']);
    labels.forEach((text) => {
      const cell = document.createElement('div');
      cell.className = 'waterfall__labels-cell';
      cell.textContent = text;
      dom.eWaterfallLabels.appendChild(cell);
    });
  }

  /* ============================================================
   * 6. Render Functions
   * ========================================================== */

  function renderTabs() {
    const isJourney = state.activeTab === 'journey';
    dom.tabButtons.forEach((btn) => {
      const active = btn.dataset.tab === state.activeTab;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    dom.panelJourney.hidden = !isJourney;
    dom.panelEcon.hidden = isJourney;
  }

  function renderPresets() {
    refs.presets.forEach((p) => {
      const activeName = p.def.tab === 'journey' ? state.journey.preset : state.economics.preset;
      const active = activeName === p.def.label && p.def.tab === state.activeTab;
      p.el.classList.toggle('is-active', active);
      p.el.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function renderJourney() {
    const model = calculateJourney();
    const idx = model.idx;
    const sel = state.journey.selectedStage;

    dom.jStateLabel.textContent = model.stateLabel;

    refs.jSliders.forEach((row) => {
      const val = state.journey.vals[row.def.key];
      if (row.input.value !== String(val)) row.input.value = val;
      setSliderFill(row.input, val, row.def.min, row.def.max);
      row.value.textContent = val + '%';
      row.idx.textContent = Math.round(idx[row.def.key]);
    });

    const chartW = chartBox.funnel.w;
    const chartH = chartBox.funnel.h;
    dom.jFunnelSvg.setAttribute('viewBox', '0 0 ' + chartW.toFixed(1) + ' ' + chartH.toFixed(1));

    const xs = stageXPositions(chartW, J_ORDER.length);
    const mids = segmentXPositions(xs);
    const pts = funnelPoints(idx, xs, chartH);

    const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    dom.jLinePath.setAttribute('d', linePath);
    dom.jAreaPath.setAttribute('d', linePath +
      ' L' + xs[xs.length - 1].toFixed(1) + ',' + chartH.toFixed(1) +
      ' L' + xs[0].toFixed(1) + ',' + chartH.toFixed(1) + ' Z');

    J_ORDER.forEach((key, i) => {
      const isSelected = sel === key;
      const x = xs[i].toFixed(1);

      const node = refs.jNodes[i];
      node.classList.toggle('is-active', isSelected);
      node.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      node.style.left = x + 'px';
      refs.jLabels[i].style.left = x + 'px';

      const mark = refs.jMarks[i];
      const p = pts[i];
      mark.circle.setAttribute('cx', x);
      mark.circle.setAttribute('cy', p.y.toFixed(1));
      mark.line.setAttribute('x1', x);
      mark.line.setAttribute('x2', x);
      mark.line.setAttribute('y1', p.y.toFixed(1));
      mark.line.setAttribute('y2', chartH.toFixed(1));
      mark.text.setAttribute('x', x);
      mark.text.setAttribute('y', (p.y - 12).toFixed(1));
      mark.circle.setAttribute('stroke', isSelected ? 'var(--brand-primary)' : 'var(--brand-line)');
      mark.text.setAttribute('fill', isSelected ? 'var(--brand-primary)' : 'var(--text-primary)');
      mark.text.textContent = Math.round(idx[key]);
    });

    J_ORDER.slice(1).forEach((key, i) => {
      refs.jLoss[i].textContent = '-' + Math.round(model.leak[key]);
      refs.jLoss[i].style.left = mids[i].toFixed(1) + 'px';
      refs.jChevrons[i].style.left = mids[i].toFixed(1) + 'px';
    });

    dom.jLargest.textContent = model.largestKey
      ? J_LABELS[model.largestKey] + ' (-' + Math.round(model.largestVal) + ')'
      : '— (0)';

    const pct = model.sessionChangePct;
    dom.jSessionChange.textContent = (pct > 0 ? '+' : '') + pct + '%';
    dom.jSessionChange.classList.toggle('is-positive', pct > 0);
    dom.jSessionChange.classList.toggle('is-negative', pct < 0);
    dom.jE2E.textContent = model.e2e + '%';

    const stageInfo = sel ? STAGE_CONTENT[sel] : null;
    if (stageInfo) {
      const leakVal = model.leak[sel] ? Math.round(model.leak[sel]) : 0;
      dom.jDecisionBoundary.hidden = false;
      dom.jContext.textContent = '판단 경계 · ' + stageInfo.context;
      dom.jInfer.textContent = stageInfo.infer + ' (-' + leakVal + ').';
      dom.jValidate.textContent = stageInfo.validate;
      fillChips(dom.jEvidence, stageInfo.evidence);
    } else {
      dom.jDecisionBoundary.hidden = true;
    }

    refs.diagCards.forEach((c) => {
      const active = sel === c.def.key;
      c.el.classList.toggle('is-active', active);
      c.head.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const showEmpty = !!sel && !stageInfo;
    dom.diagEmpty.hidden = !showEmpty;
    if (showEmpty) dom.diagEmpty.textContent = J_LABELS[sel] + ' · 정의된 확인 영역 없음';

    dom.jInfoBody.hidden = !state.journey.infoOpen;
    dom.jInfoToggle.setAttribute('aria-expanded', state.journey.infoOpen ? 'true' : 'false');
  }

  function renderEconomics() {
    const model = calculateEconomics();

    dom.eStateBadge.textContent = model.stateLabel;
    dom.eStateLabel.textContent = model.stateLabel;
    dom.eStateLabel.classList.toggle('is-positive', model.sum > 0);
    dom.eStateLabel.classList.toggle('is-negative', model.sum < 0);
    dom.eIndex.textContent = model.index;

    refs.eSliders.forEach((row) => {
      const val = state.economics.vals[row.def.key];
      if (row.input.value !== String(val)) row.input.value = val;
      setSliderFill(row.input, val, row.def.min, row.def.max);
      row.value.textContent = (val > 0 ? '+' : '') + val + row.def.unit;
    });

    const chartW = chartBox.waterfall.w;
    const chartH = chartBox.waterfall.h;
    dom.eWaterfallSvg.setAttribute('viewBox', '0 0 ' + chartW.toFixed(1) + ' ' + chartH.toFixed(1));
    refs.wfGridLines.forEach((line) => line.setAttribute('x2', chartW.toFixed(1)));

    waterfallBars(model.impacts, model.index, chartW).forEach((bar, i) => {
      const ref = refs.wfBars[i];
      ref.rect.setAttribute('x', bar.x.toFixed(1));
      ref.rect.setAttribute('y', bar.y.toFixed(1));
      ref.rect.setAttribute('width', bar.w.toFixed(1));
      ref.rect.setAttribute('height', bar.h.toFixed(1));
      ref.rect.setAttribute('fill', bar.fill);
      ref.text.setAttribute('x', bar.labelX.toFixed(1));
      ref.text.setAttribute('y', bar.labelY.toFixed(1));
      ref.text.setAttribute('fill', bar.labelColor);
      ref.text.textContent = bar.labelText;
    });

    dom.eInterp.textContent = model.interpretation;

    dom.eRankList.textContent = '';
    model.ranked.forEach((d, i) => {
      const v = model.impacts[d.key];
      const cls = v > 0 ? 'is-positive' : 'is-negative';

      const row = document.createElement('div');
      row.className = 'impact-ranking__row';

      const rank = document.createElement('span');
      rank.className = 'impact-ranking__rank';
      rank.textContent = i + 1;

      const label = document.createElement('span');
      label.className = 'impact-ranking__label';
      label.textContent = shortDriverLabel(d);

      const track = document.createElement('div');
      track.className = 'impact-ranking__track';
      const bar = document.createElement('div');
      bar.className = 'impact-ranking__bar ' + cls;
      bar.style.width = Math.max(6, (Math.abs(v) / 5) * 100) + '%';
      track.appendChild(bar);

      const value = document.createElement('span');
      value.className = 'impact-ranking__value ' + cls;
      value.textContent = (v > 0 ? '+' : '') + v;

      row.append(rank, label, track, value);
      dom.eRankList.appendChild(row);
    });
    dom.eRankEmpty.hidden = model.ranked.length > 0;

    dom.eInfoBody.hidden = !state.economics.infoOpen;
    dom.eInfoToggle.setAttribute('aria-expanded', state.economics.infoOpen ? 'true' : 'false');
  }

  function contractSection(label, value, kind) {
    const wrap = document.createElement('div');
    wrap.className = 'contract-section';

    const title = document.createElement('div');
    title.className = 'contract-section__label';
    title.textContent = label;
    wrap.appendChild(title);

    if (kind === 'chips') {
      const chips = document.createElement('div');
      chips.className = 'contract-section__chips';
      value.forEach((signal) => {
        const item = document.createElement('span');
        item.className = 'contract-signal';
        item.textContent = signal;
        chips.appendChild(item);
      });
      wrap.appendChild(chips);
      return wrap;
    }

    const text = document.createElement('p');
    text.className = 'contract-section__text' + (kind ? ' contract-section__text--' + kind : '');
    text.textContent = value;
    wrap.appendChild(text);
    return wrap;
  }

  function renderMeasurementContract() {
    const key = state.contractKey;
    const contract = key ? MEASUREMENT_CONTRACTS[key] : null;

    refs.contractTriggers.forEach((trigger) => {
      trigger.el.classList.toggle('is-open', !!contract && trigger.key === key);
    });

    if (!contract) return;

    dom.contractTitle.textContent = contract.title;
    dom.contractMeta.textContent = contract.area + ' · ' + contract.item + ' · ' + contract.type;

    dom.contractSections.textContent = '';
    CONTRACT_SECTIONS.forEach((section) => {
      const value = contract[section.key];
      if (!value || (Array.isArray(value) && !value.length)) return;
      dom.contractSections.appendChild(contractSection(section.label, value, section.kind));
    });
  }

  /**
   * The contract dialog is a leaf view: it never touches journey or economics
   * state, so it is rendered on its own rather than from render().
   */
  function render() {
    renderTabs();
    syncChartBoxes();
    renderPresets();
    renderJourney();
    renderEconomics();
  }

  /* ============================================================
   * 7. Event Handlers / Preset / Reset
   * ========================================================== */

  function setTab(tab) {
    const changed = state.activeTab !== tab;
    state.activeTab = tab;
    render();
    if (changed) trackEvent('tab_view', { tab_name: ANALYTICS.tabName[tab] });
  }

  function setJourneyVal(key, val) {
    state.journey.vals[key] = val;
    state.journey.preset = null;
    render();
  }

  function setEconomicsVal(key, val) {
    state.economics.vals[key] = val;
    state.economics.preset = null;
    render();
  }

  function selectStage(key) {
    state.journey.selectedStage = state.journey.selectedStage === key ? null : key;
    render();
    trackEvent('stage_select', { tab_name: 'journey', stage_name: key });
  }

  /** Opens the measurement contract without altering any scenario state. */
  function openContract(key, trigger) {
    state.contractKey = key;
    state.contractTrigger = trigger || null;
    renderMeasurementContract();
    document.body.classList.add('has-modal');
    dom.contractDialog.showModal();
    dom.contractBody.scrollTop = 0;
    const meta = ANALYTICS.contracts[key];
    if (meta) trackEvent('metric_contract_open', meta);
  }

  function closeContract() {
    if (dom.contractDialog.open) dom.contractDialog.close();
  }

  /** Fires for the close button, Esc, and backdrop click alike. */
  function onContractClosed() {
    const trigger = state.contractTrigger;
    state.contractKey = null;
    state.contractTrigger = null;
    document.body.classList.remove('has-modal');
    renderMeasurementContract();
    if (trigger && document.contains(trigger)) trigger.focus();
  }

  function resetJourney() {
    state.journey.vals = Object.assign({}, J_BASE);
    state.journey.selectedStage = null;
    state.journey.preset = null;
    render();
    trackEvent('scenario_reset', { tab_name: 'journey' });
  }

  function resetEconomics() {
    state.economics.vals = Object.assign({}, E_BASE);
    state.economics.preset = null;
    render();
    trackEvent('scenario_reset', { tab_name: 'economics' });
  }

  function applyPreset(key) {
    if (key === 'avail') {
      state.activeTab = 'journey';
      state.journey.vals = { selection: 80, availability: 70, start: 95, session: 95, repeat: 70 };
      state.journey.selectedStage = 'availability';
      state.journey.preset = 'Availability Stress';
    } else if (key === 'start') {
      state.activeTab = 'journey';
      state.journey.vals = { selection: 80, availability: 90, start: 65, session: 95, repeat: 70 };
      state.journey.selectedStage = 'start';
      state.journey.preset = 'Activation Failure Stress';
    } else if (key === 'op') {
      state.activeTab = 'econ';
      state.economics.vals = { utilization: 4, availability: 3, price: 0, electricity: 0, sitecost: 0, investment: 0 };
      state.economics.preset = 'Operation Improve';
    }
    render();
    const meta = ANALYTICS.presets[key];
    if (meta) trackEvent('preset_select', meta);
  }

  function bindEvents() {
    dom.tabButtons.forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
    dom.jReset.addEventListener('click', resetJourney);
    dom.eReset.addEventListener('click', resetEconomics);
    dom.jInfoToggle.addEventListener('click', () => {
      state.journey.infoOpen = !state.journey.infoOpen;
      render();
    });
    dom.eInfoToggle.addEventListener('click', () => {
      state.economics.infoOpen = !state.economics.infoOpen;
      render();
    });
    dom.contractClose.addEventListener('click', closeContract);
    dom.contractDialog.addEventListener('close', onContractClosed);
    /* Explicit Esc handling so the close path does not depend solely on the
       user agent's native close-request behaviour. */
    dom.contractDialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeContract();
    });
    /* The dialog element itself is only hit when the backdrop is clicked. */
    dom.contractDialog.addEventListener('click', (event) => {
      if (event.target === dom.contractDialog) closeContract();
    });
  }

  /** Re-lays out both charts whenever their container width changes. */
  function observeChartBoxes() {
    const onBoxChange = () => {
      if (syncChartBoxes()) {
        renderJourney();
        renderEconomics();
      }
    };

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(onBoxChange);
      observer.observe(dom.jFunnelBox);
      observer.observe(dom.eWaterfallBox);
    }
    window.addEventListener('resize', onBoxChange);
  }

  /* ============================================================
   * 8. Initialization
   * ========================================================== */

  function init() {
    buildPresets();
    buildJourneySliders();
    buildFunnelStatic();
    buildDiagCards();
    buildEconomicsSliders();
    buildWaterfallStatic();
    fillContractAwareChips(dom.recoveryChecks, RECOVERY_CHECKS);
    fillChips(dom.recoveryEvidence, RECOVERY_EVIDENCE);
    bindEvents();
    render();
    observeChartBoxes();
  }

  init();
})();
/*
=== 
*/
