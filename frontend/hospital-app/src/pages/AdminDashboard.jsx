import React, { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Select,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import {
  cancelAppointmentByAdmin,
  deleteDepartmentClosure,
  fetchAuditLogs,
  fetchDepartmentAppointments,
  fetchDepartmentClosures,
  fetchManagedDepartments,
  saveDepartmentClosure,
} from "../api/adminApi";
import { useAuth } from "../auth/AuthContext";
import { LoadingCard } from "../components/LoadingState";
import PageShell from "../components/PageShell";
import { dayPickerFormatters, dayPickerLocale } from "../utils/dayPickerLocale";
import { buildAuditLogDepartmentOptions, filterAuditLogs } from "../utils/auditLogs";
import { formatDate, formatDateTime, parseDateInput, toDateInputValue } from "../utils/dateTime";

function AdminLoadingLayout() {
  return (
    <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={6}>
      <LoadingCard minH="320px" titleWidth="38%" lines={5} />
      <LoadingCard minH="320px" titleWidth="38%" lines={5} />
      <LoadingCard minH="320px" titleWidth="38%" lines={5} />
      <LoadingCard minH="320px" titleWidth="38%" lines={5} />
      <LoadingCard minH="320px" titleWidth="38%" lines={5} />
    </Grid>
  );
}

export default function AdminDashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [closures, setClosures] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [closureSaving, setClosureSaving] = useState(false);
  const [cancelingAppointmentId, setCancelingAppointmentId] = useState("");
  const [closureForm, setClosureForm] = useState({
    departmentId: "",
    date: toDateInputValue(new Date()),
    reason: "",
  });
  const [appointmentFilter, setAppointmentFilter] = useState({
    departmentId: "",
    date: toDateInputValue(new Date()),
  });
  const [auditLogFilter, setAuditLogFilter] = useState({
    department: "",
    name: "",
    date: "",
  });
  const [isAuditDatePickerOpen, setIsAuditDatePickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAuditLogs = async () => {
    const result = await fetchAuditLogs(token);
    setAuditLogs(result.items);
  };

  useEffect(() => {
    const loadAdminData = async () => {
      setPageLoading(true);
      setError("");

      try {
        const [departmentRes, closureRes, auditLogRes] = await Promise.all([
          fetchManagedDepartments(token),
          fetchDepartmentClosures(token),
          fetchAuditLogs(token),
        ]);
        setDepartments(departmentRes.items);
        setClosures(closureRes.items);
        setAuditLogs(auditLogRes.items);
      } catch (nextError) {
        setError(nextError.message || "管理情報の取得に失敗しました。");
      } finally {
        setPageLoading(false);
      }
    };

    loadAdminData();
  }, [token]);

  useEffect(() => {
    if (departments.length === 0) {
      return;
    }

    setClosureForm((current) => ({
      ...current,
      departmentId: current.departmentId || departments[0].id,
    }));
    setAppointmentFilter((current) => ({
      ...current,
      departmentId: current.departmentId || departments[0].id,
    }));
  }, [departments]);

  useEffect(() => {
    if (!appointmentFilter.departmentId || !appointmentFilter.date) {
      return;
    }

    setAppointmentsLoading(true);
    setError("");

    fetchDepartmentAppointments({
      departmentId: appointmentFilter.departmentId,
      date: appointmentFilter.date,
      token,
    })
      .then((result) => setAppointments(result.items))
      .catch((nextError) => setError(nextError.message || "予約一覧の取得に失敗しました。"))
      .finally(() => setAppointmentsLoading(false));
  }, [appointmentFilter, token]);

  const auditLogDepartmentOptions = useMemo(
    () => buildAuditLogDepartmentOptions(departments),
    [departments]
  );

  const filteredAuditLogs = useMemo(
    () => filterAuditLogs(auditLogs, auditLogFilter),
    [auditLogs, auditLogFilter]
  );
  const selectedAuditLogDate = auditLogFilter.date ? parseDateInput(auditLogFilter.date) : undefined;
  const auditLogListHeight = { base: "360px", md: "460px" };

  const handleSaveClosure = async () => {
    if (!closureForm.departmentId || !closureForm.date) {
      setError("診療科と日付を選択してください。");
      return;
    }

    setClosureSaving(true);
    setError("");
    setMessage("");

    try {
      const saved = await saveDepartmentClosure({
        departmentId: closureForm.departmentId,
        date: closureForm.date,
        reason: closureForm.reason,
        token,
      });
      setClosures((current) => {
        const next = current.filter((item) => item.id !== saved.id);
        return [...next, saved].sort((left, right) => left.date.localeCompare(right.date));
      });
      setMessage("休診日を登録しました。新規予約は受け付けなくなります。");
      setClosureForm((current) => ({ ...current, reason: "" }));
      await loadAuditLogs();
    } catch (nextError) {
      setError(nextError.message || "休診日の登録に失敗しました。");
    } finally {
      setClosureSaving(false);
    }
  };

  const handleDeleteClosure = async (closure) => {
    setError("");
    setMessage("");

    try {
      await deleteDepartmentClosure({
        departmentId: closure.department_id,
        date: closure.date,
        token,
      });
      setClosures((current) => current.filter((item) => item.id !== closure.id));
      setMessage("休診日を解除しました。");
      await loadAuditLogs();
    } catch (nextError) {
      setError(nextError.message || "休診日の解除に失敗しました。");
    }
  };

  const handleCancelAppointment = async (appointment) => {
    const confirmed = window.confirm(
      `${appointment.patient_user_name} さんの予約をキャンセルします。通知は送信されません。`
    );
    if (!confirmed) {
      return;
    }

    setCancelingAppointmentId(appointment.id);
    setError("");
    setMessage("");

    try {
      await cancelAppointmentByAdmin({
        appointmentId: appointment.id,
        userId: appointment.user_id,
        token,
      });
      setAppointments((current) => current.filter((item) => item.id !== appointment.id));
      setMessage("予約をキャンセルしました。");
      await loadAuditLogs();
    } catch (nextError) {
      setError(nextError.message || "予約のキャンセルに失敗しました。");
    } finally {
      setCancelingAppointmentId("");
    }
  };

  return (
    <PageShell
      title="管理者画面"
      subtitle="休診日設定、予約確認、監査ログ確認を行う画面です。"
      heroSubtitle="総合病院の運用管理画面です。診療科管理、休診日、予約状況の確認を行います。"
      backTo="/"
      actions={
        <HStack spacing={3}>
          <Button variant="outline" onClick={() => navigate("/")}>
            患者画面へ
          </Button>
          <Button colorScheme="red" variant="outline" onClick={logout}>
            ログアウト
          </Button>
        </HStack>
      }
    >
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      {message && (
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{message}</Text>
        </Alert>
      )}

      {pageLoading ? (
        <AdminLoadingLayout />
      ) : (
        <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={6}>
          <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
            <Stack spacing={4}>
              <Heading size="md">診療科管理</Heading>
              <Text color="surface.700">
                診療科の追加、表示順変更、受付状態の切り替え、削除は専用ページでまとめて行います。
              </Text>
              <Button colorScheme="teal" alignSelf="flex-start" onClick={() => navigate("/admin/departments")}>
                診療科管理ページを開く
              </Button>
              <Box maxH={{ base: "320px", md: "420px" }} overflowY="auto" pr={2}>
                <Stack spacing={3}>
                  {departments.map((department) => (
                    <Box key={department.id} borderWidth="1px" borderColor="surface.200" borderRadius="20px" p={4}>
                      <HStack justify="space-between" align="center">
                        <Box>
                          <Text fontSize="lg" fontWeight="800">
                            {department.name}
                          </Text>
                        </Box>
                        <Badge
                          colorScheme={department.is_active ? "teal" : "red"}
                          px={3}
                          py={1}
                          borderRadius="full"
                        >
                          {department.is_active ? "受付中" : "停止中"}
                        </Badge>
                      </HStack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
            <Stack spacing={4}>
              <Heading size="md">休診日を登録する</Heading>
              <Text color="surface.700">
                指定した診療科と日付の新規予約を止めます。通知は送信されません。
              </Text>
              <FormControl>
                <FormLabel>診療科</FormLabel>
                <Select
                  value={closureForm.departmentId}
                  onChange={(event) =>
                    setClosureForm((current) => ({ ...current, departmentId: event.target.value }))
                  }
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>日付</FormLabel>
                <Input
                  type="date"
                  value={closureForm.date}
                  onChange={(event) =>
                    setClosureForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>理由</FormLabel>
                <Textarea
                  value={closureForm.reason}
                  onChange={(event) =>
                    setClosureForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="例: 学会参加のため、院内研修のため"
                  minH="120px"
                />
              </FormControl>
              <Button colorScheme="orange" onClick={handleSaveClosure} isLoading={closureSaving}>
                休診日を登録する
              </Button>
            </Stack>
          </Box>

          <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
            <Stack spacing={4}>
              <Heading size="md">登録済みの休診日</Heading>
              {closures.length === 0 ? (
                <Text color="surface.700">休診日はまだ登録されていません。</Text>
              ) : (
                <Box maxH={{ base: "320px", md: "420px" }} overflowY="auto" pr={2}>
                  <Stack spacing={3}>
                    {closures.map((closure) => (
                      <Box key={closure.id} borderWidth="1px" borderColor="surface.200" borderRadius="20px" p={4}>
                        <Stack spacing={2}>
                          <HStack justify="space-between" align="flex-start">
                            <Box>
                              <Text fontWeight="800">{closure.department_name}</Text>
                              <Text>{closure.date}</Text>
                            </Box>
                            <Button
                              size="sm"
                              variant="outline"
                              colorScheme="red"
                              onClick={() => handleDeleteClosure(closure)}
                            >
                              解除
                            </Button>
                          </HStack>
                          <Text color="surface.700">{closure.reason || "理由未入力"}</Text>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>

          <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
            <Stack spacing={4}>
              <Heading size="md">日付ごとの予約確認</Heading>
              <Text color="surface.700">
                既存予約の確認と代行キャンセルができます。キャンセルしても通知は送信されません。
              </Text>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <FormControl>
                  <FormLabel>診療科</FormLabel>
                  <Select
                    value={appointmentFilter.departmentId}
                    onChange={(event) =>
                      setAppointmentFilter((current) => ({
                        ...current,
                        departmentId: event.target.value,
                      }))
                    }
                  >
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>日付</FormLabel>
                  <Input
                    type="date"
                    value={appointmentFilter.date}
                    onChange={(event) =>
                      setAppointmentFilter((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                  />
                </FormControl>
              </Grid>

              {appointmentsLoading ? (
                <LoadingCard minH="220px" titleWidth="24%" lines={4} />
              ) : appointments.length === 0 ? (
                <Text color="surface.700">この条件の予約はありません。</Text>
              ) : (
                <Box maxH={{ base: "360px", md: "460px" }} overflowY="auto" pr={2}>
                  <Stack spacing={3}>
                    {appointments.map((appointment) => (
                      <Box
                        key={appointment.id}
                        borderWidth="1px"
                        borderColor="surface.200"
                        borderRadius="20px"
                        p={4}
                      >
                        <Stack spacing={3}>
                          <HStack justify="space-between" align="flex-start">
                            <Box>
                              <Text fontSize="lg" fontWeight="800">
                                {appointment.patient_user_name}
                              </Text>
                              <Text color="surface.700">{formatDateTime(appointment.start_at)}</Text>
                            </Box>
                            <Button
                              size="sm"
                              colorScheme="red"
                              variant="outline"
                              isLoading={cancelingAppointmentId === appointment.id}
                              onClick={() => handleCancelAppointment(appointment)}
                            >
                              予約をキャンセル
                            </Button>
                          </HStack>
                          <Text>メール: {appointment.patient_email || "未登録"}</Text>
                          <Text>電話番号: {appointment.patient_phone || "未登録"}</Text>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>

          <Box
            bg="white"
            borderRadius="24px"
            p={{ base: 5, md: 7 }}
            boxShadow="sm"
            gridColumn={{ base: "auto", xl: "1 / -1" }}
          >
            <Stack spacing={4}>
              <Heading size="md">監査ログ</Heading>
              <Text color="surface.700">管理者操作と予約操作の履歴を新しい順に表示します。</Text>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr", xl: "1fr 1fr 1fr" }} gap={4}>
                <FormControl minW={0}>
                  <FormLabel>診療科で絞り込む</FormLabel>
                  <Select
                    value={auditLogFilter.department}
                    onChange={(event) =>
                      setAuditLogFilter((current) => ({
                        ...current,
                        department: event.target.value,
                      }))
                    }
                  >
                    <option value="">すべての診療科</option>
                    {auditLogDepartmentOptions.map((departmentName) => (
                      <option key={departmentName} value={departmentName}>
                        {departmentName}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl minW={0}>
                  <FormLabel>名前で検索</FormLabel>
                  <Input
                    type="search"
                    value={auditLogFilter.name}
                    onChange={(event) =>
                      setAuditLogFilter((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="例: 山田、admin@sample.com"
                  />
                </FormControl>
                <FormControl minW={0}>
                  <FormLabel>日付で検索</FormLabel>
                  <Stack spacing={2}>
                    <Popover
                      isOpen={isAuditDatePickerOpen}
                      onClose={() => setIsAuditDatePickerOpen(false)}
                      placement="bottom-start"
                      isLazy
                    >
                      <PopoverTrigger>
                        <Button
                          variant="outline"
                          justifyContent="space-between"
                          width="100%"
                          minH="40px"
                          onClick={() => setIsAuditDatePickerOpen((current) => !current)}
                        >
                          <Text noOfLines={1} flex="1" textAlign="left">
                            {auditLogFilter.date ? formatDate(auditLogFilter.date) : "日付を選択してください"}
                          </Text>
                          <Text fontSize="sm" color="surface.700" flexShrink={0} ml={3}>
                            {auditLogFilter.date ? "変更" : "開く"}
                          </Text>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent width="fit-content" maxW="100%">
                        <PopoverArrow />
                        <PopoverBody p={3}>
                          <Stack spacing={3}>
                            <Box className="calendar-picker admin-log-date-picker">
                              <DayPicker
                                mode="single"
                                selected={selectedAuditLogDate}
                                onSelect={(value) => {
                                  setAuditLogFilter((current) => ({
                                    ...current,
                                    date: value ? toDateInputValue(value) : "",
                                  }));
                                  if (value) {
                                    setIsAuditDatePickerOpen(false);
                                  }
                                }}
                                locale={dayPickerLocale}
                                formatters={dayPickerFormatters}
                                lang="ja"
                              />
                            </Box>
                            <HStack justify="space-between">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAuditLogFilter((current) => ({
                                    ...current,
                                    date: "",
                                  }));
                                  setIsAuditDatePickerOpen(false);
                                }}
                              >
                                クリア
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAuditLogFilter((current) => ({
                                    ...current,
                                    date: toDateInputValue(new Date()),
                                  }));
                                  setIsAuditDatePickerOpen(false);
                                }}
                              >
                                今日
                              </Button>
                            </HStack>
                          </Stack>
                        </PopoverBody>
                      </PopoverContent>
                    </Popover>
                    <Text fontSize="sm" color="surface.700">
                      {auditLogFilter.date
                        ? `選択中: ${formatDate(auditLogFilter.date)}`
                        : "日付を選ぶと、その日に関係するログだけを表示します。"}
                    </Text>
                  </Stack>
                </FormControl>
              </Grid>

              <HStack justify="space-between" align="center" flexWrap="wrap">
                <Text color="surface.700">
                  {filteredAuditLogs.length} 件 / 全 {auditLogs.length} 件を表示
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setAuditLogFilter({
                      department: "",
                      name: "",
                      date: "",
                    })
                  }
                >
                  絞り込みをクリア
                </Button>
              </HStack>

              <Box minH={auditLogListHeight} maxH={auditLogListHeight} overflowY="auto" pr={2}>
                {auditLogs.length === 0 ? (
                  <Stack align="center" justify="center" h="100%">
                    <Text color="surface.700">監査ログはまだありません。</Text>
                  </Stack>
                ) : filteredAuditLogs.length === 0 ? (
                  <Stack align="center" justify="center" h="100%">
                    <Text color="surface.700">条件に一致する監査ログはありません。</Text>
                  </Stack>
                ) : (
                  <Stack spacing={3}>
                    {filteredAuditLogs.map((log) => (
                      <Box key={log.id} borderWidth="1px" borderColor="surface.200" borderRadius="20px" p={4}>
                        <Stack spacing={2}>
                          <HStack justify="space-between" align="flex-start">
                            <Text fontWeight="800">{log.summary}</Text>
                            <Badge
                              colorScheme={log.actor_type === "admin" ? "purple" : "teal"}
                              px={3}
                              py={1}
                              borderRadius="full"
                            >
                              {log.actor_type === "admin" ? "管理者" : "患者"}
                            </Badge>
                          </HStack>
                          <Text color="surface.700">
                            実行者: {log.actor_user_name || log.actor_email || "不明"}
                          </Text>
                          {log.details?.patient_user_name && (
                            <Text color="surface.700">対象患者: {log.details.patient_user_name}</Text>
                          )}
                          {log.details?.department_name && (
                            <Text color="surface.700">診療科: {log.details.department_name}</Text>
                          )}
                          {log.details?.start_at && (
                            <Text color="surface.700">
                              対象日時: {formatDateTime(log.details.start_at)}
                            </Text>
                          )}
                          <Text color="surface.700">
                            実行日時: {log.created_at ? formatDateTime(log.created_at) : "不明"}
                          </Text>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>
        </Grid>
      )}
    </PageShell>
  );
}
