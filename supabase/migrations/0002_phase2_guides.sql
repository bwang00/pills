-- Phase 2: Add muscle relaxation and mindfulness guides

insert into guides (slug, title, description, category, config, sort_order) values
  (
    'muscle-relax-quick',
    '快速肌肉放松',
    '5个部位的渐进式肌肉放松，适合时间紧张时使用。',
    'muscle_relax',
    '{"steps": [
      {"body_part": "肩膀", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "收紧你的肩膀，向上提起", "relax_prompt": "放松肩膀，让它们自然下沉"},
      {"body_part": "手臂", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "握紧拳头，收紧手臂", "relax_prompt": "松开拳头，让手臂完全放松"},
      {"body_part": "腹部", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "收紧腹部肌肉", "relax_prompt": "放松腹部，感受柔软"},
      {"body_part": "大腿", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "收紧大腿肌肉", "relax_prompt": "放松大腿，感受沉重"},
      {"body_part": "双脚", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "绷紧脚趾，收紧双脚", "relax_prompt": "放松双脚，感受温暖"}
    ]}',
    1
  ),
  (
    'muscle-relax-full',
    '完整肌肉放松',
    '8个部位的深度渐进式肌肉放松，适合充分放松。',
    'muscle_relax',
    '{"steps": [
      {"body_part": "额头", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "皱起眉头，收紧额头", "relax_prompt": "放松额头，让皱纹舒展"},
      {"body_part": "下巴", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "咬紧牙关，收紧下巴", "relax_prompt": "放松下巴，微微张开嘴"},
      {"body_part": "肩膀", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "收紧你的肩膀，向上提起", "relax_prompt": "放松肩膀，让它们自然下沉"},
      {"body_part": "手臂", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "握紧拳头，收紧手臂", "relax_prompt": "松开拳头，让手臂完全放松"},
      {"body_part": "腹部", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "收紧腹部肌肉", "relax_prompt": "放松腹部，感受柔软"},
      {"body_part": "背部", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "收紧背部，向后拱起", "relax_prompt": "放松背部，感受支撑"},
      {"body_part": "大腿", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "收紧大腿肌肉", "relax_prompt": "放松大腿，感受沉重"},
      {"body_part": "双脚", "tense_duration": 5, "relax_duration": 10, "tense_prompt": "绷紧脚趾，收紧双脚", "relax_prompt": "放松双脚，感受温暖"}
    ]}',
    2
  ),
  (
    'mindfulness-3',
    '3分钟正念冥想',
    '短暂的正念练习，帮助快速回到当下。',
    'mindfulness',
    '{"duration_minutes": 3, "prompts": [
      {"time_pct": 0, "text": "闭上眼睛，开始关注你的呼吸"},
      {"time_pct": 15, "text": "注意空气进入鼻腔的感觉"},
      {"time_pct": 30, "text": "观察你的思绪，不要评判"},
      {"time_pct": 50, "text": "注意周围的声音，让它们自然流过"},
      {"time_pct": 70, "text": "感受身体的重量和支撑"},
      {"time_pct": 85, "text": "做三次深呼吸，慢慢回来"},
      {"time_pct": 100, "text": "慢慢睁开眼睛"}
    ]}',
    1
  ),
  (
    'mindfulness-5',
    '5分钟正念冥想',
    '适度的正念练习，适合日常使用。',
    'mindfulness',
    '{"duration_minutes": 5, "prompts": [
      {"time_pct": 0, "text": "找一个舒适的姿势，闭上眼睛"},
      {"time_pct": 10, "text": "开始关注你的呼吸，不试图改变它"},
      {"time_pct": 25, "text": "注意你的腹部随着呼吸起伏"},
      {"time_pct": 40, "text": "如果思绪飘走了，温柔地拉回呼吸"},
      {"time_pct": 55, "text": "扩展注意力到整个身体"},
      {"time_pct": 70, "text": "观察此刻你周围的声⾳和⽓味"},
      {"time_pct": 85, "text": "感受此刻的平静"},
      {"time_pct": 95, "text": "慢慢做三次深呼吸"},
      {"time_pct": 100, "text": "准备好了就睁开眼睛"}
    ]}',
    2
  ),
  (
    'mindfulness-10',
    '10分钟深度冥想',
    '较长时间的正念练习，适合有冥想基础的用户。',
    'mindfulness',
    '{"duration_minutes": 10, "prompts": [
      {"time_pct": 0, "text": "安坐，闭眼，做三次深呼吸"},
      {"time_pct": 8, "text": "让呼吸回到自然的节奏"},
      {"time_pct": 18, "text": "注意吸气和呼气的不同感觉"},
      {"time_pct": 30, "text": "观察思绪来了又去，像云朵飘过"},
      {"time_pct": 42, "text": "注意身体哪里有紧绷或放松"},
      {"time_pct": 55, "text": "扫描身体，从头到脚"},
      {"time_pct": 68, "text": "聆听周围的声音，不贴标签"},
      {"time_pct": 80, "text": "感受此刻的完整和宁静"},
      {"time_pct": 92, "text": "做几次深呼吸，准备回来"},
      {"time_pct": 100, "text": "慢慢睁开眼睛，带着平静继续"}
    ]}',
    3
  )
on conflict (slug) do nothing;
