#!/bin/bash

# --- 設定項目 ---
IMAGE_NAME="ai-scheduler-mcp"
CONTAINER_NAME="ai-scheduler-mcp-server"
DEFAULT_PORT="3003" # デフォルトポート
DEFAULT_RESTART_POLICY="unless-stopped" # デフォルトの再起動ポリシー
NETWORK_NAME="mcp-network" # 接続するDockerネットワーク

# --- グローバル変数 ---
# スクリプトの場所を取得
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
# プロジェクトルートディレクトリ (scriptsディレクトリの一つ上)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")

# --- ヘルパー関数 ---

# Dockerネットワークが存在するか確認し、なければ作成する関数
_ensure_network() {
  if ! docker network inspect "${NETWORK_NAME}" > /dev/null 2>&1; then
    echo "Dockerネットワーク '${NETWORK_NAME}' が存在しません。作成します..."
    docker network create "${NETWORK_NAME}"
    if [ $? -ne 0 ]; then
      echo "エラー: Dockerネットワーク '${NETWORK_NAME}' の作成に失敗しました。" >&2
      return 1
    fi
    echo "Dockerネットワーク '${NETWORK_NAME}' を作成しました。"
  fi
  return 0
}

# ヘルプメッセージを表示する関数
_show_help() {
  local script_name
  script_name=$(basename "$0")
  echo "使用方法: ${script_name} [コマンド] [オプション]"
  echo ""
  echo "コマンド:"
  echo "  build          Dockerイメージをビルドします。"
  echo "  start          Dockerコンテナを起動します。"
  echo "  stop           Dockerコンテナを停止および削除します。"
  echo "  logs           Dockerコンテナのログを表示します。"
  echo "  delete         Dockerコンテナを停止・削除し、イメージも削除します（確認あり）。"
  echo "  help, -h, --help このヘルプメッセージを表示します。"
  echo ""
  echo "start コマンドのオプション:"
  echo "  -P, --port PORT    公開するポート番号を指定します (デフォルト: ${DEFAULT_PORT})。"
  echo "  -r, --restart POLICY 再起動ポリシーを指定します (デフォルト: ${DEFAULT_RESTART_POLICY})。"
  echo "                     例: no, on-failure, always, unless-stopped"
  echo ""
  echo "例:"
  echo "  ${script_name} build"
  echo "  ${script_name} start"
  echo "  ${script_name} start -P 8080 -r always"
  echo "  ${script_name} stop"
  echo "  ${script_name} logs"
  echo "  ${script_name} delete"
}


# --- コマンド関数 ---

# Dockerイメージをビルドする関数
_build_image() {
  echo "Dockerイメージ '${IMAGE_NAME}' をビルドします..."
  (cd "$PROJECT_ROOT" && docker build -t "${IMAGE_NAME}" .)
  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    echo "ビルドが完了しました。"
  else
    echo "エラー: ビルドに失敗しました。" >&2
  fi
  return $exit_code
}

# Dockerコンテナを起動する関数
_start_container() {
  local port="${DEFAULT_PORT}"
  local restart_policy="${DEFAULT_RESTART_POLICY}"

  # オプション引数をパース
  while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
      -P|--port)
        port="$2"
        shift # 引数名をスキップ
        shift # 値をスキップ
        ;;
      -r|--restart)
        restart_policy="$2"
        shift # 引数名をスキップ
        shift # 値をスキップ
        ;;
      *)    # 不明なオプション
        echo "不明なオプション: $1" >&2
        _show_help >&2
        return 1
        ;;
    esac
  done

  # ネットワークの存在確認と作成
  if ! _ensure_network; then
    return 1
  fi

  echo "Dockerコンテナ '${CONTAINER_NAME}' をポート ${port} で起動します (ネットワーク: ${NETWORK_NAME}, 再起動ポリシー: ${restart_policy})..."

  # 既存の同名コンテナがあれば停止・削除
  if [ "$(docker ps -q -f name=^/${CONTAINER_NAME}$)" ]; then
      echo "既存のコンテナ '${CONTAINER_NAME}' を停止・削除します..."
      docker stop "${CONTAINER_NAME}" > /dev/null
      docker rm "${CONTAINER_NAME}" > /dev/null
  elif [ "$(docker ps -aq -f status=exited -f name=^/${CONTAINER_NAME}$)" ]; then
      echo "既存の停止済みコンテナ '${CONTAINER_NAME}' を削除します..."
      docker rm "${CONTAINER_NAME}" > /dev/null
  fi

  # コンテナを起動
  docker run -d \
    --name "${CONTAINER_NAME}" \
    --network "${NETWORK_NAME}" \
    -p "${port}:${port}" \
    --restart "${restart_policy}" \
    -e PORT="${port}" \
    "${IMAGE_NAME}"

  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    echo "コンテナ '${CONTAINER_NAME}' が起動しました。"
  else
    echo "エラー: コンテナの起動に失敗しました。" >&2
  fi
  return $exit_code
}

# Dockerコンテナを停止・削除する関数
_stop_container() {
  echo "Dockerコンテナ '${CONTAINER_NAME}' を停止・削除します..."
  local stopped=0
  local removed=0
  if [ "$(docker ps -q -f name=^/${CONTAINER_NAME}$)" ]; then
      docker stop "${CONTAINER_NAME}" > /dev/null && stopped=1
      docker rm "${CONTAINER_NAME}" > /dev/null && removed=1
      if [ $stopped -eq 1 ] && [ $removed -eq 1 ]; then
        echo "コンテナを停止・削除しました。"
      else
        echo "エラー: コンテナの停止または削除に失敗しました。" >&2
        return 1
      fi
  elif [ "$(docker ps -aq -f status=exited -f name=^/${CONTAINER_NAME}$)" ]; then
      docker rm "${CONTAINER_NAME}" > /dev/null && removed=1
      if [ $removed -eq 1 ]; then
        echo "停止済みのコンテナを削除しました。"
      else
         echo "エラー: 停止済みコンテナの削除に失敗しました。" >&2
         return 1
      fi
  else
      echo "コンテナ '${CONTAINER_NAME}' は見つかりません。"
  fi
  return 0
}

# Dockerコンテナのログを表示する関数
_show_logs() {
  if ! docker ps -q -f name=^/${CONTAINER_NAME}$ > /dev/null; then
     if ! docker ps -aq -f status=exited -f name=^/${CONTAINER_NAME}$ > /dev/null; then
       echo "コンテナ '${CONTAINER_NAME}' は見つかりません。" >&2
       return 1
     fi
  fi
  echo "コンテナ '${CONTAINER_NAME}' のログを表示します (Ctrl+Cで終了)..."
  docker logs -f "${CONTAINER_NAME}"
  return $?
}

# コンテナとイメージを削除する関数
_delete_all() {
  _stop_container # まずコンテナを停止・削除
  local stop_exit_code=$?
  # コンテナが見つからない場合(exit code 0)は続行、それ以外のエラーは停止
  if [ $stop_exit_code -ne 0 ] && [[ "$(docker ps -aq -f name=^/${CONTAINER_NAME}$)" ]]; then
      return $stop_exit_code
  fi


  if [ "$(docker images -q ${IMAGE_NAME})" ]; then
    # ユーザーに確認 (非インタラクティブモードを考慮)
    if [ -t 0 ]; then # 標準入力がターミナルに接続されているか確認
        read -p "Dockerイメージ '${IMAGE_NAME}' も削除しますか？ (y/N): " confirm < /dev/tty
    else
        confirm="n" # 非インタラクティブモードでは削除しない
        echo "非インタラクティブモードのため、イメージ削除はスキップします。"
    fi

    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      echo "Dockerイメージ '${IMAGE_NAME}' を削除します..."
      docker rmi "${IMAGE_NAME}"
      local rmi_exit_code=$?
      if [ $rmi_exit_code -eq 0 ]; then
        echo "イメージを削除しました。"
      else
        echo "エラー: イメージの削除に失敗しました。" >&2
        return $rmi_exit_code
      fi
    else
      echo "イメージの削除はキャンセルされました。"
    fi
  else
      echo "イメージ '${IMAGE_NAME}' は見つかりません。"
  fi
  return 0
}

# --- メイン処理 ---
# 第一引数に基づいてコマンドを実行

COMMAND=$1
# コマンドがない場合はヘルプを表示
if [ -z "$COMMAND" ]; then
    _show_help
    exit 0
fi

shift # 第一引数（コマンド）を消費し、残りを各関数に渡す

case $COMMAND in
  build)
    _build_image
    ;;
  start)
    _start_container "$@" # 残りの引数をstart関数に渡す
    ;;
  stop)
    _stop_container
    ;;
  logs)
    _show_logs
    ;;
  delete)
    _delete_all
    ;;
  help|-h|--help)
    _show_help
    ;;
  *)
    echo "不明なコマンド: $COMMAND" >&2
    _show_help >&2
    exit 1
    ;;
esac

exit $?