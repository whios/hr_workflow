/**
 * Authorization scope items (Section 2)
 */
export const AUTH_SCOPE_ITEMS = [
  '身份基础信息核验（姓名、证件号一致性）',
  '社会聘用记录与任职/参股企业工商信息（含担任法定代表人、股东、高管情况）',
  '工作经历核实（既往任职单位、岗位、任职时间、离职原因等）',
  '司法涉诉与裁判文书信息',
  '失信被执行与限制高消费信息',
  '劳动仲裁与劳动争议记录',
  '学历、学位及职业资格证书真实性核验',
] as const;

/**
 * Full authorization text stored in DB and shown on receipt/PDF
 */
export function buildAuthorizationText(companyName: string, candidateName: string, idNumber: string): string {
  const scopeList = AUTH_SCOPE_ITEMS.map((item, i) => `${i + 1}. ${item}`).join('；');

  return [
    `本人 ${candidateName}（身份证号：${idNumber}）确认与 ${companyName} 存在入职/合作背景调查关系，特此作出以下授权与声明。`,
    '',
    '1 信息真实性承诺',
    '本人确认，在本次背景调查过程中所提供的全部个人信息、文件材料及电子数据均真实、完整、有效，不存在虚假记载、误导性陈述或重大遗漏。如经核实存在虚假信息，本人自愿承担由此产生的一切后果，包括但不限于被取消录用资格、终止合作或解除已签订的劳动合同。',
    '',
    '2 授权范围（逐项列明）',
    '本人自愿授权对以下事项进行核实，范围以本清单为限，不作扩大解释：',
    scopeList + '。',
    '',
    '3 授权目的与信息使用',
    '授权目的：仅用于本次录用决策前的风险审查与岗位适配性判断，不作授权范围以外用途。',
    '使用与保密：核查信息严格保密，仅限 HR 及必要决策人员内部使用；录用/未录用后按档案制度规定的期限销毁或返还。',
    '敏感信息处理：本人同意完整身份证号和手机号随本授权回执保存，并仅供指定 HR 进行身份核验与必要联络；回执链接不得向无关人员转发。',
    '',
    '4 授权期限与撤回限制',
    '本授权自签署之日起生效，至背景调查项目结束且相关结果送达被授权方之日终止。本人理解，在背景调查实施过程中或完成后，单方撤回授权不影响已依法开展的核查工作及已形成的结论。',
    '',
    '5 责任豁免',
    '被授权方及其委托的第三方机构依据本授权书所实施的合理核查行为，以及基于本人提供的联系方式所进行的信息联络，本人均予以认可并豁免其因此产生的合理法律责任。',
  ].join('\n');
}

/**
 * Short authorization summary for form checkbox
 */
export function buildAuthSummary(companyName: string, candidateName: string): string {
  return `本人 ${candidateName} 确认与 ${companyName} 存在入职/合作背景调查关系，自愿授权该公司或其委托的第三方机构按照本页面所列授权范围（含身份核验、聘用记录、工作经历、司法涉诉、失信信息、劳动仲裁、学历学位等）进行核实，相关信息仅用于本次录用决策前的风险审查，核查结果严格保密。本人承诺所提供信息真实完整，并理解虚假信息可能导致录用资格被取消。`;
}
